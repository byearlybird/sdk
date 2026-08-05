import type { LamportClock } from "./clock.ts";
import { planLocalMutations, prepareMutation } from "./mutation.ts";
import type { MutationIntent } from "./mutation.ts";
import { compileQuery, getQueryBuilder } from "./query.ts";
import type { QueryBuilder, QueryDefinition } from "./query.ts";
import {
  createAcknowledgeCommand,
  decodeEntity,
  initializeDatabase,
  readPendingChanges,
  readString,
} from "./records.ts";
import type { MutationExecution } from "./records.ts";
import {
  normalizeAcknowledgments,
  normalizePendingLimit,
  normalizeSyncChanges,
  planRemoteChanges,
} from "./sync.ts";
import type { SyncChange } from "./sync.ts";
import type { StorageAdapter, StorageConnection } from "./storage.ts";

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
  acknowledgeChanges(changeIds: readonly string[]): Promise<void>;
  applyRemoteChanges(changes: readonly SyncChange[]): Promise<void>;
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
  getPendingChanges(limit: number): Promise<SyncChange[]>;
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

export function createDatabase<Schema>(options: DatabaseOptions): Database<Schema> {
  if (options.name.trim().length === 0) {
    throw new TypeError("The database name cannot be empty.");
  }

  const initialized = initializeDatabase(options.name, options.storage);
  const ready = initialized.then(() => undefined);
  void ready.catch(() => undefined);
  let closed = false;
  let closePromise: Promise<void> | undefined;
  let currentClock: LamportClock | undefined;
  let mutationQueue = Promise.resolve();
  const changeListeners = new Set<(change: DatabaseChange<Schema>) => void>();

  async function getReadableConnection(): Promise<StorageConnection> {
    if (closed) throw new Error("The database is closed.");
    await mutationQueue;
    const { connection } = await initialized;
    if (closed) throw new Error("The database is closed.");
    return connection;
  }

  function enqueueMutation<Result>(
    operation: (
      connection: StorageConnection,
      clock: LamportClock,
    ) => Promise<MutationExecution<Result>>,
  ): Promise<Result> {
    if (closed) return Promise.reject(new Error("The database is closed."));

    const result = mutationQueue.then(async () => {
      const database = await initialized;
      const clock = currentClock ?? database.clock;
      const execution = await operation(database.connection, clock);
      if (execution.commands.length > 0) {
        await database.connection.executeTransaction(execution.commands);
        currentClock = execution.nextClock;
        for (const change of execution.changes) {
          notifyChange(change as DatabaseChange<Schema>);
        }
      }
      return execution.value;
    });
    mutationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function readEntries<Collection extends CollectionName<Schema>>(
    collection: Collection,
    definition: QueryDefinition,
  ): Promise<DatabaseEntry<Schema[Collection]>[]> {
    const compiled = compileQuery(collection, definition);
    const database = await getReadableConnection();
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
    const prepared = intents.map(prepareMutation);
    return enqueueMutation((connection, clock) => planLocalMutations(connection, clock, prepared));
  }

  return {
    ready,
    acknowledgeChanges: async (changeIds) => {
      const acknowledgments = normalizeAcknowledgments(changeIds);
      if (acknowledgments.length === 0) return;
      await enqueueMutation(async (_connection, clock) => ({
        changes: [],
        commands: acknowledgments.map(createAcknowledgeCommand),
        nextClock: clock,
        value: undefined,
      }));
    },
    applyRemoteChanges: async (changes) => {
      const normalized = normalizeSyncChanges(changes);
      if (normalized.length === 0) return;
      await enqueueMutation((connection, clock) =>
        planRemoteChanges(connection, clock, normalized),
      );
    },
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
      const database = await getReadableConnection();
      const [row] = await database.query(
        `
          SELECT entity
          FROM entities
          WHERE collection = ? AND entity_id = ? AND deleted = 0
        `,
        [collection, id],
      );
      return row === undefined ? null : decodeEntity<Schema[typeof collection]>(row);
    },
    getPendingChanges: async (limit) => {
      const normalizedLimit = normalizePendingLimit(limit);
      const database = await getReadableConnection();
      return readPendingChanges(database, normalizedLimit);
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
        await mutationQueue;
        const database = await initialized;
        await database.connection.close();
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
