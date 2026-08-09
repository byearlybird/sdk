import { compareVersions } from "@byearlybird/sync";
import type { SyncPullPage, Version } from "@byearlybird/sync";
import type { EncryptedSyncRecord } from "@byearlybird/sync/crypto";
import { createPullCursor, parsePullCursor } from "@byearlybird/sync/server";
import { DatabaseSync } from "node:sqlite";

export interface SyncStorage {
  pull(request: {
    appDomain: string;
    cursor: string | null;
    limit: number;
  }): SyncPullPage<EncryptedSyncRecord>;
  push(appDomain: string, changes: readonly EncryptedSyncRecord[]): void;
}

export interface SqliteSyncStorage extends SyncStorage {
  close(): void;
}

export function createSqliteSyncStorage(filename: string): SqliteSyncStorage {
  const database = new DatabaseSync(filename);
  database.exec(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      sequence INTEGER NOT NULL CHECK (sequence >= 0)
    ) STRICT;

    INSERT OR IGNORE INTO sync_metadata (id, sequence) VALUES (1, 0);

    CREATE TABLE IF NOT EXISTS sync_records (
      app_domain TEXT NOT NULL,
      collection TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      change_id TEXT NOT NULL,
      version_counter INTEGER NOT NULL,
      version_replica_id TEXT NOT NULL,
      key_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      sequence INTEGER NOT NULL UNIQUE,
      PRIMARY KEY (app_domain, collection, entity_id),
      UNIQUE (app_domain, change_id)
    ) STRICT;

    CREATE INDEX IF NOT EXISTS sync_records_pull
      ON sync_records (app_domain, sequence);
  `);

  const readCurrentSequence = database.prepare("SELECT sequence FROM sync_metadata WHERE id = 1");
  readCurrentSequence.setReadBigInts(true);
  const advanceSequence = database.prepare(`
    UPDATE sync_metadata SET sequence = sequence + 1 WHERE id = 1 RETURNING sequence
  `);
  advanceSequence.setReadBigInts(true);
  const findChange = database.prepare(`
    SELECT collection, entity_id, version_counter, version_replica_id
    FROM sync_records
    WHERE app_domain = ? AND change_id = ?
  `);
  const findEntity = database.prepare(`
    SELECT change_id, version_counter, version_replica_id
    FROM sync_records
    WHERE app_domain = ? AND collection = ? AND entity_id = ?
  `);
  const upsertRecord = database.prepare(`
    INSERT INTO sync_records (
      app_domain,
      collection,
      entity_id,
      change_id,
      version_counter,
      version_replica_id,
      key_id,
      payload,
      sequence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (app_domain, collection, entity_id) DO UPDATE SET
      change_id = excluded.change_id,
      version_counter = excluded.version_counter,
      version_replica_id = excluded.version_replica_id,
      key_id = excluded.key_id,
      payload = excluded.payload,
      sequence = excluded.sequence
  `);
  const pullRecords = database.prepare(`
    SELECT
      app_domain,
      change_id,
      collection,
      entity_id,
      key_id,
      payload,
      sequence,
      version_counter,
      version_replica_id
    FROM sync_records
    WHERE app_domain = ? AND sequence > ?
    ORDER BY sequence
    LIMIT ?
  `);
  pullRecords.setReadBigInts(true);
  let closed = false;

  function storeChange(appDomain: string, incoming: EncryptedSyncRecord): void {
    if (incoming.appDomain !== appDomain) {
      throw new TypeError("A sync record does not match the requested app domain.");
    }

    const repeated = findChange.get(appDomain, incoming.changeId);
    if (repeated !== undefined) {
      if (
        readString(repeated, "collection") !== incoming.collection ||
        readString(repeated, "entity_id") !== incoming.entityId ||
        compareVersions(incoming.version, readVersion(repeated)) !== 0
      ) {
        throw new TypeError("A sync change ID cannot be reused for another change.");
      }
      return;
    }

    const stored = findEntity.get(appDomain, incoming.collection, incoming.entityId);
    if (stored !== undefined) {
      const comparison = compareVersions(incoming.version, readVersion(stored));
      if (comparison < 0) return;
      if (comparison === 0) {
        throw new TypeError(
          "A sync change cannot reuse an entity version with a different change ID.",
        );
      }
    }

    const sequence = readBigInt(advanceSequence.get(), "sequence");
    upsertRecord.run(
      appDomain,
      incoming.collection,
      incoming.entityId,
      incoming.changeId,
      incoming.version.counter,
      incoming.version.replicaId,
      incoming.keyId,
      incoming.payload,
      sequence,
    );
  }

  return {
    close: () => {
      if (closed) return;
      closed = true;
      database.close();
    },
    pull: ({ appDomain, cursor: cursorValue, limit }) => {
      if (!Number.isSafeInteger(limit) || limit <= 0) {
        throw new RangeError("A synchronization pull limit must be a positive safe integer.");
      }
      const cursor = cursorValue === null ? 0n : parsePullCursor(cursorValue);
      const currentSequence = readBigInt(readCurrentSequence.get(), "sequence");
      if (cursor > currentSequence) {
        throw new RangeError("A synchronization pull cursor is ahead of the server sequence.");
      }

      const rows = pullRecords.all(appDomain, cursor, BigInt(limit) + 1n);
      const page = rows.slice(0, limit).map((row) => ({
        record: readStoredRecord(row),
        sequence: readBigInt(row, "sequence"),
      }));
      const last = page.at(-1);
      return {
        changes: page.map(({ record }) => record),
        cursor: last === undefined ? (cursorValue ?? "0") : createPullCursor(last.sequence),
        hasMore: rows.length > limit,
      };
    },
    push: (appDomain, changes) => {
      database.exec("BEGIN IMMEDIATE");
      try {
        for (const change of changes) storeChange(appDomain, change);
        database.exec("COMMIT");
      } catch (error) {
        try {
          database.exec("ROLLBACK");
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            "The sync push failed and could not be rolled back.",
          );
        }
        throw error;
      }
    },
  };
}

function readStoredRecord(row: Record<string, unknown>): EncryptedSyncRecord {
  return {
    appDomain: readString(row, "app_domain"),
    changeId: readString(row, "change_id"),
    collection: readString(row, "collection"),
    entityId: readString(row, "entity_id"),
    format: 1,
    keyId: readString(row, "key_id"),
    payload: readString(row, "payload"),
    version: readVersion(row),
  };
}

function readVersion(row: Record<string, unknown>): Version {
  const storedCounter = row.version_counter;
  const counter = typeof storedCounter === "bigint" ? Number(storedCounter) : storedCounter;
  if (typeof counter !== "number" || !Number.isSafeInteger(counter) || counter < 0) {
    throw new Error("SQLite returned an invalid sync version counter.");
  }
  return { counter, replicaId: readString(row, "version_replica_id") };
}

function readString(row: Record<string, unknown>, column: string): string {
  const value = row[column];
  if (typeof value !== "string") throw new Error(`SQLite returned an invalid ${column}.`);
  return value;
}

function readBigInt(row: Record<string, unknown> | undefined, column: string): bigint {
  const value = row?.[column];
  if (typeof value !== "bigint" || value < 0n) {
    throw new Error(`SQLite returned an invalid ${column}.`);
  }
  return value;
}
