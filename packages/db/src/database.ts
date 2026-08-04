import { compileQuery, getQueryBuilder } from "./query.ts";
import type { QueryBuilder, QueryDefinition } from "./query.ts";
import type { SqliteBinding, SqliteRow, StorageAdapter, StorageConnection } from "./storage.ts";

export type {
  QueryBuilder,
  QueryDefinition,
  QueryOrder,
  QueryPredicate,
  QueryScalar,
} from "./query.ts";
export type { StorageAdapter, StorageConnection, StorageRunResult } from "./storage.ts";

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

  return {
    ready,
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
      const database = await getOpenSqlite();
      await database.run(
        `
          INSERT INTO entities (collection, entity_id, entity)
          VALUES (?, ?, ?)
        `,
        [collection, id, encodeEntity(data)],
      );
      notifyChange({ collection, id, operation: "insert" });
    },
    onChange: (listener) => {
      changeListeners.add(listener);
      return () => {
        changeListeners.delete(listener);
      };
    },
    patch: async (collection, id, changes) => {
      const database = await getOpenSqlite();
      const entries = Object.entries(changes);
      if (entries.length === 0) {
        const rows = await database.query(
          `
            SELECT entity_id
            FROM entities
            WHERE collection = ? AND entity_id = ?
          `,
          [collection, id],
        );
        return rows.length > 0;
      }

      const patch = createJsonSetPatch(entries);
      const result = await database.run(
        `
          UPDATE entities
          SET entity = ${patch.expression}
          WHERE collection = ? AND entity_id = ?
        `,
        [...patch.bindings, collection, id],
      );
      const changed = result.changes > 0;
      if (changed) notifyChange({ collection, id, operation: "update" });
      return changed;
    },
    delete: async (collection, id) => {
      const database = await getOpenSqlite();
      const result = await database.run(
        `
          DELETE FROM entities
          WHERE collection = ? AND entity_id = ?
        `,
        [collection, id],
      );
      const changed = result.changes > 0;
      if (changed) notifyChange({ collection, id, operation: "delete" });
      return changed;
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

function encodeEntity(entity: unknown): string {
  try {
    if (!isJsonCompatible(entity)) throw new Error();
    const encoded = JSON.stringify(entity);
    if (encoded === undefined) throw new Error();
    return encoded;
  } catch (cause) {
    throw new TypeError("Database entities must be JSON-serializable.", { cause });
  }
}

function createJsonSetPatch(entries: readonly (readonly [string, unknown])[]): Readonly<{
  bindings: readonly SqliteBinding[];
  expression: string;
}> {
  return {
    bindings: entries.flatMap(([key, value]) => [key, encodeEntity(value)]),
    expression: `json_set(
      entity,
      ${entries.map(() => "'$.' || json_quote(?), json(?)").join(",\n")}
    )`,
  };
}

function isJsonCompatible(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object") return false;

  const isArray = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (!isArray && prototype !== Object.prototype && prototype !== null) return false;
  if (ancestors.has(value)) return false;

  ancestors.add(value);
  const children = isArray ? Array.from(value) : Object.values(value);
  const compatible = children.every((child) => isJsonCompatible(child, ancestors));
  ancestors.delete(value);
  return compatible;
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
