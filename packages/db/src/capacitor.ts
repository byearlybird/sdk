import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { readChangeCount } from "./storage.ts";
import type {
  SqliteBinding,
  SqliteRow,
  StorageAdapter,
  StorageCommand,
  StorageCommandResult,
  StorageConnection,
} from "./storage.ts";

type CapacitorResult = {
  result?: boolean;
};

type CapacitorDatabaseConnection = Pick<
  SQLiteDBConnection,
  | "beginTransaction"
  | "commitTransaction"
  | "isDBOpen"
  | "open"
  | "query"
  | "rollbackTransaction"
  | "run"
>;

type CapacitorConnectionManager = {
  checkConnectionsConsistency(): Promise<CapacitorResult>;
  closeConnection(databaseName: string, readOnly: boolean): Promise<void>;
  createConnection(
    databaseName: string,
    encrypted: boolean,
    mode: string,
    version: number,
    readOnly: boolean,
  ): Promise<CapacitorDatabaseConnection>;
  isConnection(databaseName: string, readOnly: boolean): Promise<CapacitorResult>;
  retrieveConnection(databaseName: string, readOnly: boolean): Promise<CapacitorDatabaseConnection>;
};

const connectionOptions = {
  encrypted: false,
  mode: "no-encryption",
  readOnly: false,
  version: 1,
} as const;

const defaultConnectionManager = new SQLiteConnection(CapacitorSQLite);

export function createCapacitorStorageAdapter(
  connectionManager: CapacitorConnectionManager = defaultConnectionManager,
): StorageAdapter {
  return {
    open: (databaseName) => openCapacitorDatabase(connectionManager, databaseName),
  };
}

async function openCapacitorDatabase(
  connectionManager: CapacitorConnectionManager,
  databaseName: string,
): Promise<StorageConnection> {
  if (databaseName.trim().length === 0) {
    throw new TypeError("The SQLite database name cannot be empty.");
  }

  let database: CapacitorDatabaseConnection | undefined;
  try {
    await connectionManager.checkConnectionsConsistency();
    const connectionExists = await connectionManager.isConnection(
      databaseName,
      connectionOptions.readOnly,
    );

    database = connectionExists.result
      ? await connectionManager.retrieveConnection(databaseName, connectionOptions.readOnly)
      : await connectionManager.createConnection(
          databaseName,
          connectionOptions.encrypted,
          connectionOptions.mode,
          connectionOptions.version,
          connectionOptions.readOnly,
        );

    const open = await database.isDBOpen();
    if (!open.result) await database.open();
  } catch (error) {
    if (database !== undefined) {
      await connectionManager
        .closeConnection(databaseName, connectionOptions.readOnly)
        .catch(() => undefined);
    }
    throw error;
  }

  let closed = false;
  let closePromise: Promise<void> | undefined;
  let operationQueue = Promise.resolve();

  function enqueue<Result>(operation: () => Promise<Result>): Promise<Result> {
    if (closed) return Promise.reject(new Error("The SQLite database is closed."));
    const result = operationQueue.then(operation);
    operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return {
    executeTransaction: (commands) =>
      enqueue(async () => {
        if (commands.length === 0) return [];

        await database.beginTransaction();
        try {
          const results: StorageCommandResult[] = [];
          for (const command of commands) {
            results.push(await executeCommand(database, command));
          }
          await database.commitTransaction();
          return results;
        } catch (error) {
          try {
            await database.rollbackTransaction();
          } catch (rollbackError) {
            throw new AggregateError(
              [error, rollbackError],
              "The SQLite transaction failed and could not be rolled back.",
            );
          }
          throw error;
        }
      }),
    query: (sql, bindings = []) =>
      enqueue(async () => {
        const result = await database.query(sql, toCapacitorBindings(bindings));
        return readRows(result.values);
      }),
    run: (sql, bindings = []) =>
      enqueue(async () => {
        const result = await database.run(sql, toCapacitorBindings(bindings));
        return { changes: readChangeCount(result.changes?.changes) };
      }),
    close: () => {
      closePromise ??= (() => {
        closed = true;
        return operationQueue.then(() =>
          connectionManager.closeConnection(databaseName, connectionOptions.readOnly),
        );
      })();
      return closePromise;
    },
  };
}

async function executeCommand(
  database: CapacitorDatabaseConnection,
  command: StorageCommand,
): Promise<StorageCommandResult> {
  const bindings = toCapacitorBindings(command.bindings ?? []);
  if (command.kind === "query") {
    const result = await database.query(command.sql, bindings);
    return { kind: "query", rows: readRows(result.values) };
  }

  const result = await database.run(command.sql, bindings, false);
  return {
    changes: readChangeCount(result.changes?.changes),
    kind: "run",
  };
}

function toCapacitorBindings(bindings: readonly SqliteBinding[]): SqliteBinding[] {
  return [...bindings];
}

function readRows(values: unknown): SqliteRow[] {
  if (values === undefined) return [];
  if (!Array.isArray(values)) {
    throw new TypeError("Capacitor SQLite returned an invalid row list.");
  }
  return values.map((value) => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new TypeError("Capacitor SQLite returned an invalid row.");
    }
    return { ...value };
  });
}
