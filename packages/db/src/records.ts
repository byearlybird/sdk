import { createLamportClock } from "./clock.ts";
import type { LamportClock, Version } from "./clock.ts";
import type { SyncChange } from "./sync.ts";
import type { SqliteRow, StorageAdapter, StorageCommand, StorageConnection } from "./storage.ts";

export type StoredRecord = Readonly<{
  deleted: boolean;
  encodedEntity: null | string;
  outboxChangeId?: string;
  version: Version;
}>;

export type UntypedDatabaseChange = Readonly<{
  collection: string;
  id: string;
  operation: "delete" | "insert" | "update";
}>;

export type MutationExecution<Result> = Readonly<{
  changes: readonly UntypedDatabaseChange[];
  commands: readonly StorageCommand[];
  nextClock: LamportClock;
  value: Result;
}>;

export type InitializedDatabase = Readonly<{
  clock: LamportClock;
  connection: StorageConnection;
}>;

const createEntitiesTable = `
  CREATE TABLE IF NOT EXISTS entities (
    collection TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity TEXT,
    version_counter INTEGER NOT NULL,
    version_replica_id TEXT NOT NULL,
    deleted INTEGER NOT NULL CHECK (deleted IN (0, 1)),
    CHECK (
      (deleted = 0 AND entity IS NOT NULL AND json_valid(entity))
      OR (deleted = 1 AND entity IS NULL)
    ),
    PRIMARY KEY (collection, entity_id)
  )
`;

const createSyncStateTable = `
  CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    counter INTEGER NOT NULL,
    replica_id TEXT NOT NULL
  )
`;

const createSyncOutboxTable = `
  CREATE TABLE IF NOT EXISTS sync_outbox (
    collection TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    change_id TEXT NOT NULL UNIQUE,
    PRIMARY KEY (collection, entity_id)
  )
`;

const upsertEntitySql = `
  INSERT INTO entities (
    collection,
    entity_id,
    entity,
    version_counter,
    version_replica_id,
    deleted
  ) VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT (collection, entity_id) DO UPDATE SET
    entity = excluded.entity,
    version_counter = excluded.version_counter,
    version_replica_id = excluded.version_replica_id,
    deleted = excluded.deleted
`;

const upsertOutboxSql = `
  INSERT INTO sync_outbox (collection, entity_id, change_id)
  VALUES (?, ?, ?)
  ON CONFLICT (collection, entity_id) DO UPDATE SET
    change_id = excluded.change_id
`;

const updateClockSql = `
  UPDATE sync_state
  SET counter = ?, replica_id = ?
  WHERE id = 1
`;

export async function initializeDatabase(
  name: string,
  storage: StorageAdapter,
): Promise<InitializedDatabase> {
  const connection = await storage.open(name);
  try {
    await connection.run(createEntitiesTable);
    await connection.run(createSyncStateTable);
    await connection.run(createSyncOutboxTable);
    await connection.run(
      "INSERT OR IGNORE INTO sync_state (id, counter, replica_id) VALUES (1, 0, ?)",
      [crypto.randomUUID()],
    );
    const [row] = await connection.query("SELECT counter, replica_id FROM sync_state WHERE id = 1");
    if (row === undefined) throw new TypeError("SQLite did not initialize synchronization state.");
    return {
      clock: createLamportClock(
        readNonnegativeInteger(row, "counter"),
        readString(row, "replica_id"),
      ),
      connection,
    };
  } catch (error) {
    await connection.close().catch(() => undefined);
    throw error;
  }
}

export async function readStoredRecord(
  connection: StorageConnection,
  collection: string,
  id: string,
): Promise<StoredRecord | null> {
  const [row] = await connection.query(
    `
      SELECT
        entities.entity,
        entities.version_counter,
        entities.version_replica_id,
        entities.deleted,
        sync_outbox.change_id
      FROM entities
      LEFT JOIN sync_outbox USING (collection, entity_id)
      WHERE entities.collection = ? AND entities.entity_id = ?
    `,
    [collection, id],
  );
  if (row === undefined) return null;
  const deleted = readBooleanInteger(row, "deleted");
  const entity = row.entity;
  if ((!deleted && typeof entity !== "string") || (deleted && entity !== null)) {
    throw new TypeError("SQLite returned an invalid entity state.");
  }
  const changeId = row.change_id;
  if (changeId !== null && changeId !== undefined && typeof changeId !== "string") {
    throw new TypeError('SQLite returned an invalid "change_id" value.');
  }
  return {
    deleted,
    encodedEntity: entity as null | string,
    ...(typeof changeId === "string" ? { outboxChangeId: changeId } : {}),
    version: readVersion(row),
  };
}

export async function readPendingChanges(
  connection: StorageConnection,
  limit: number,
): Promise<SyncChange[]> {
  const rows = await connection.query(
    `
      SELECT
        sync_outbox.change_id,
        entities.collection,
        entities.entity_id,
        entities.entity,
        entities.version_counter,
        entities.version_replica_id,
        entities.deleted
      FROM sync_outbox
      JOIN entities USING (collection, entity_id)
      ORDER BY
        entities.version_counter,
        entities.version_replica_id,
        entities.collection,
        entities.entity_id
      LIMIT ?
    `,
    [limit],
  );
  return rows.map(readSyncChange);
}

export function createEntityCommand(
  collection: string,
  id: string,
  record: Pick<StoredRecord, "deleted" | "encodedEntity" | "version">,
): StorageCommand {
  return {
    bindings: [
      collection,
      id,
      record.encodedEntity,
      record.version.counter,
      record.version.replicaId,
      record.deleted ? 1 : 0,
    ],
    kind: "run",
    sql: upsertEntitySql,
  };
}

export function createOutboxCommand(
  collection: string,
  id: string,
  changeId: string,
): StorageCommand {
  return {
    bindings: [collection, id, changeId],
    kind: "run",
    sql: upsertOutboxSql,
  };
}

export function createAcknowledgeCommand(changeId: string): StorageCommand {
  return {
    bindings: [changeId],
    kind: "run",
    sql: "DELETE FROM sync_outbox WHERE change_id = ?",
  };
}

export function createClearOutboxCommand(collection: string, id: string): StorageCommand {
  return {
    bindings: [collection, id],
    kind: "run",
    sql: "DELETE FROM sync_outbox WHERE collection = ? AND entity_id = ?",
  };
}

export function createClockCommand(clock: LamportClock): StorageCommand {
  return {
    bindings: [clock.counter, clock.replicaId],
    kind: "run",
    sql: updateClockSql,
  };
}

export function decodeEntity<Entity>(row: SqliteRow): Entity {
  return JSON.parse(readString(row, "entity")) as Entity;
}

export function readString(row: SqliteRow, column: string): string {
  const value = row[column];
  if (typeof value !== "string") {
    throw new TypeError(`SQLite returned an invalid "${column}" value.`);
  }
  return value;
}

export function recordKey(collection: string, id: string): string {
  return `${collection.length}:${collection}${id}`;
}

function readSyncChange(row: SqliteRow): SyncChange {
  const deleted = readBooleanInteger(row, "deleted");
  const base = {
    changeId: readString(row, "change_id"),
    collection: readString(row, "collection"),
    entityId: readString(row, "entity_id"),
    format: 1 as const,
    version: readVersion(row),
  };
  if (deleted) return Object.freeze({ ...base, deleted: true });
  return Object.freeze({
    ...base,
    deleted: false,
    entity: JSON.parse(readString(row, "entity")) as unknown,
  });
}

function readVersion(row: SqliteRow): Version {
  return Object.freeze({
    counter: readNonnegativeInteger(row, "version_counter"),
    replicaId: readString(row, "version_replica_id"),
  });
}

function readNonnegativeInteger(row: SqliteRow, column: string): number {
  const value = row[column];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`SQLite returned an invalid "${column}" value.`);
  }
  return value;
}

function readBooleanInteger(row: SqliteRow, column: string): boolean {
  const value = row[column];
  if (value !== 0 && value !== 1) {
    throw new TypeError(`SQLite returned an invalid "${column}" value.`);
  }
  return value === 1;
}
