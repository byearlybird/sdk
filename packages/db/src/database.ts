import { compileMutation, readMutationOutcome } from "./mutation.ts";
import type { CompiledMutation, MutationIntent } from "./mutation.ts";
import { compileQuery, getQueryBuilder } from "./query.ts";
import type { QueryBuilder, QueryDefinition } from "./query.ts";
import type {
  SqliteRow,
  StorageAdapter,
  StorageCommand,
  StorageCommandResult,
  StorageConnection,
} from "./storage.ts";

type BatchMutator<Schema> = Readonly<{
  delete<Collection extends CollectionName<Schema>>(collection: Collection, id: string): void;
  insert<Collection extends CollectionName<Schema>>(
    collection: Collection,
    id: string,
    data: Schema[Collection],
  ): void;
  patch<Collection extends CollectionName<Schema>>(
    collection: Collection,
    id: string,
    changes: DatabasePatch<Schema[Collection]>,
  ): void;
}>;

export type CollectionName<Schema> = Extract<keyof Schema, string>;

export type DatabaseEntry<Data> = {
  data: Data;
  id: string;
};

export type DatabasePatch<Data> = Data extends readonly unknown[]
  ? never
  : Data extends object
    ? { [Key in keyof Data]?: Exclude<Data[Key], undefined> }
    : never;

export type DatabaseChange<Schema> = {
  [Collection in CollectionName<Schema>]: Readonly<{
    collection: Collection;
    id: string;
    operation: "delete" | "insert" | "update";
  }>;
}[CollectionName<Schema>];

export type Database<Schema> = {
  readonly ready: Promise<void>;
  batch(build: (mutation: BatchMutator<Schema>) => void): Promise<void>;
  close(): Promise<void>;
  delete<Collection extends CollectionName<Schema>>(
    collection: Collection,
    id: string,
  ): Promise<boolean>;
  get<Collection extends CollectionName<Schema>>(
    collection: Collection,
    id: string,
  ): Promise<Schema[Collection] | null>;
  getAll<Collection extends CollectionName<Schema>>(
    collection: Collection,
  ): Promise<DatabaseEntry<Schema[Collection]>[]>;
  insert<Collection extends CollectionName<Schema>>(
    collection: Collection,
    id: string,
    data: Schema[Collection],
  ): Promise<void>;
  onChange(listener: (change: DatabaseChange<Schema>) => void): () => void;
  patch<Collection extends CollectionName<Schema>>(
    collection: Collection,
    id: string,
    changes: DatabasePatch<Schema[Collection]>,
  ): Promise<boolean>;
  query<Collection extends CollectionName<Schema>>(
    collection: Collection,
    build: (query: QueryBuilder<Schema[Collection]>) => QueryDefinition,
  ): Promise<DatabaseEntry<Schema[Collection]>[]>;
};

export type DatabaseOptions = {
  name: string;
  storage: StorageAdapter;
};

const createEntitiesTable = `
  CREATE TABLE IF NOT EXISTS entities (
    collection TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity TEXT NOT NULL CHECK (json_valid(entity)),
    PRIMARY KEY (collection, entity_id)
  )
`;

export function createDatabase<Schema>(options: DatabaseOptions): Database<Schema> {
  if (options.name.trim().length === 0) {
    throw new TypeError("The database name cannot be empty.");
  }

  const sqliteReady = openAndInitialize(options.name, options.storage);
  const ready = sqliteReady.then(() => undefined);
  void ready.catch(() => undefined);
  let closed = false;
  let closePromise: Promise<void> | undefined;
  const changeListeners = new Set<(change: DatabaseChange<Schema>) => void>();

  async function getOpenSqlite(): Promise<StorageConnection> {
    if (closed) throw new Error("The database is closed.");
    const database = await sqliteReady;
    if (closed) throw new Error("The database is closed.");
    return database;
  }

  async function readEntries<Collection extends CollectionName<Schema>>(
    collection: Collection,
    definition: QueryDefinition,
  ): Promise<DatabaseEntry<Schema[Collection]>[]> {
    const compiled = compileQuery(collection, definition);
    const database = await getOpenSqlite();
    const rows = await database.query(compiled.sql, compiled.bindings);
    return rows.map((row) => ({
      data: decodeEntity<Schema[Collection]>(row),
      id: readString(row, "entity_id"),
    }));
  }

  function notifyChange(change: DatabaseChange<Schema>): void {
    for (const listener of Array.from(changeListeners)) {
      try {
        listener(change);
      } catch (error) {
        reportListenerError(error);
      }
    }
  }

  async function executeMutations(
    intents: readonly MutationIntent[],
  ): Promise<readonly (boolean | undefined)[]> {
    const mutations = intents.map(compileMutation);
    const database = await getOpenSqlite();
    const results = await executeCompiledMutations(database, mutations);

    if (results.length !== mutations.length) {
      throw new TypeError("Storage returned an invalid number of transaction results.");
    }

    const outcomes = mutations.map((mutation, index) =>
      readMutationOutcome(mutation, results[index]),
    );
    for (const outcome of outcomes) {
      if (outcome.change !== undefined) {
        notifyChange(outcome.change as DatabaseChange<Schema>);
      }
    }
    return outcomes.map(({ value }) => value);
  }

  return {
    ready,
    batch: async (build) => {
      const intents: MutationIntent[] = [];
      let collecting = true;
      const mutator = createBatchMutator<Schema>(intents, () => collecting);
      let result: unknown;
      try {
        result = build(mutator);
      } finally {
        collecting = false;
      }
      if (isPromiseLike(result)) {
        void Promise.resolve(result).catch(() => undefined);
        throw new TypeError("A database batch callback must be synchronous.");
      }
      if (result !== undefined) {
        throw new TypeError("A database batch callback must not return a value.");
      }
      await executeMutations(intents);
    },
    getAll: (collection) => readEntries(collection, {}),
    get: async (collection, id) => {
      const database = await getOpenSqlite();
      const [row] = await database.query(
        `
          SELECT entity
          FROM entities
          WHERE collection = ? AND entity_id = ?
        `,
        [collection, id],
      );
      return row === undefined ? null : decodeEntity<Schema[typeof collection]>(row);
    },
    query: async (collection, build) => {
      return readEntries(collection, build(getQueryBuilder<Schema[typeof collection]>()));
    },
    insert: async (collection, id, data) => {
      await executeMutations([{ collection, data, id, operation: "insert" }]);
    },
    onChange: (listener) => {
      changeListeners.add(listener);
      return () => {
        changeListeners.delete(listener);
      };
    },
    patch: async (collection, id, changes) => {
      const [changed] = await executeMutations([{ changes, collection, id, operation: "patch" }]);
      return changed as boolean;
    },
    delete: async (collection, id) => {
      const [changed] = await executeMutations([{ collection, id, operation: "delete" }]);
      return changed as boolean;
    },
    close: () => {
      closePromise ??= (async () => {
        closed = true;
        changeListeners.clear();
        const database = await sqliteReady;
        await database.close();
      })();
      return closePromise;
    },
  };
}

function createBatchMutator<Schema>(
  intents: MutationIntent[],
  isCollecting: () => boolean,
): BatchMutator<Schema> {
  function add(intent: MutationIntent): void {
    if (!isCollecting()) {
      throw new Error("Database batch mutations can only be added inside the batch callback.");
    }
    intents.push(intent);
  }

  const deleteMutation: BatchMutator<Schema>["delete"] = (collection, id) => {
    add({ collection, id, operation: "delete" });
  };
  const insert: BatchMutator<Schema>["insert"] = (collection, id, data) => {
    add({ collection, data, id, operation: "insert" });
  };
  const patch: BatchMutator<Schema>["patch"] = (collection, id, changes) => {
    add({ changes, collection, id, operation: "patch" });
  };
  return Object.freeze({ delete: deleteMutation, insert, patch });
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}

async function executeCommand(
  database: StorageConnection,
  command: StorageCommand,
): Promise<StorageCommandResult> {
  if (command.kind === "query") {
    const rows = await database.query(command.sql, command.bindings);
    return { kind: "query", rows };
  }
  const result = await database.run(command.sql, command.bindings);
  return { changes: result.changes, kind: "run" };
}

async function executeCompiledMutations(
  database: StorageConnection,
  mutations: readonly CompiledMutation[],
): Promise<readonly StorageCommandResult[]> {
  if (mutations.length === 0) return [];
  if (mutations.length === 1) {
    return [await executeCommand(database, mutations[0].command)];
  }
  return database.executeTransaction(mutations.map(({ command }) => command));
}

async function openAndInitialize(
  name: string,
  storage: StorageAdapter,
): Promise<StorageConnection> {
  const database = await storage.open(name);
  try {
    await database.run(createEntitiesTable);
    return database;
  } catch (error) {
    await database.close().catch(() => undefined);
    throw error;
  }
}

function decodeEntity<Entity>(row: SqliteRow): Entity {
  return JSON.parse(readString(row, "entity")) as Entity;
}

function readString(row: SqliteRow, column: string): string {
  const value = row[column];
  if (typeof value !== "string") {
    throw new TypeError(`SQLite returned an invalid "${column}" value.`);
  }
  return value;
}

function reportListenerError(error: unknown): void {
  try {
    if (typeof globalThis.reportError === "function") {
      globalThis.reportError(error);
    } else {
      console.error("A database change listener failed.", error);
    }
  } catch {
    // Error reporting must not make a committed database write appear to fail.
  }
}
