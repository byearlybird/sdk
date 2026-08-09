import { DatabaseSync } from "node:sqlite";

export interface SyncStorage {
  getItem(key: string): unknown;
  setItem(key: string, value: unknown): void;
}

export interface SqliteSyncStorage extends SyncStorage {
  close(): void;
}

export function createSqliteSyncStorage(filename: string): SqliteSyncStorage {
  const database = new DatabaseSync(filename);
  database.exec(`
    CREATE TABLE IF NOT EXISTS storage (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    ) STRICT
  `);
  const getItem = database.prepare("SELECT value FROM storage WHERE key = ?");
  const setItem = database.prepare(`
    INSERT INTO storage (key, value) VALUES (?, ?)
    ON CONFLICT (key) DO UPDATE SET value = excluded.value
  `);
  let closed = false;

  return {
    close: () => {
      if (closed) return;
      closed = true;
      database.close();
    },
    getItem: (key) => {
      const row = getItem.get(key);
      if (row === undefined) return null;
      if (typeof row.value !== "string") {
        throw new TypeError(`Stored value for "${key}" is not JSON text.`);
      }
      return JSON.parse(row.value) as unknown;
    },
    setItem: (key, value) => {
      const serialized = JSON.stringify(value);
      if (serialized === undefined) {
        throw new TypeError(`Value for "${key}" cannot be serialized as JSON.`);
      }
      setItem.run(key, serialized);
    },
  };
}
