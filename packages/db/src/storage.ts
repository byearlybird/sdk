export type SqliteBinding = null | number | string;
export type SqliteRow = Readonly<Record<string, unknown>>;

export type StorageRunResult = Readonly<{
  changes: number;
}>;

export type StorageConnection = {
  close(): Promise<void>;
  query(sql: string, bindings?: readonly SqliteBinding[]): Promise<SqliteRow[]>;
  run(sql: string, bindings?: readonly SqliteBinding[]): Promise<StorageRunResult>;
};

export type StorageAdapter = {
  open(databaseName: string): Promise<StorageConnection>;
};

export function readChangeCount(value: unknown): number {
  const changes = typeof value === "bigint" ? Number(value) : value;
  if (typeof changes !== "number" || !Number.isSafeInteger(changes) || changes < 0) {
    throw new TypeError("SQLite returned an invalid affected-row count.");
  }
  return changes;
}
