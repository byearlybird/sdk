export type SqliteBinding = null | number | string;
export type SqliteRow = Readonly<Record<string, unknown>>;

export type StorageRunResult = Readonly<{
  changes: number;
}>;

export type StorageCommand =
  | Readonly<{
      bindings?: readonly SqliteBinding[];
      kind: "query";
      sql: string;
    }>
  | Readonly<{
      bindings?: readonly SqliteBinding[];
      kind: "run";
      sql: string;
    }>;

export type StorageCommandResult =
  | Readonly<{
      kind: "query";
      rows: SqliteRow[];
    }>
  | Readonly<{
      changes: number;
      kind: "run";
    }>;

export type StorageConnection = {
  close(): Promise<void>;
  executeTransaction(commands: readonly StorageCommand[]): Promise<readonly StorageCommandResult[]>;
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
