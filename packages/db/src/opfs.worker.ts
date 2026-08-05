import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import type { Database, SAHPoolUtil } from "@sqlite.org/sqlite-wasm";
import type { SqliteWorkerRequest, SqliteWorkerResponse } from "./opfs.ts";
import { readChangeCount } from "./storage.ts";
import type {
  SqliteBinding,
  StorageCommand,
  StorageCommandResult,
  StorageRunResult,
} from "./storage.ts";

const poolDirectory = ".byearlybird-db-opfs";
const poolName = "byearlybird-db-opfs";
const poolCapacity = 6;
const poolOwnershipLock = "@byearlybird/db:sqlite-opfs-pool";

type WorkerScope = {
  navigator: Navigator;
  onmessage: ((event: MessageEvent<SqliteWorkerRequest>) => void) | null;
  postMessage(message: SqliteWorkerResponse): void;
};

const workerScope = globalThis as unknown as WorkerScope;
const sqlitePromise = sqlite3InitModule();
let poolPromise: Promise<SAHPoolUtil> | undefined;
let database: Database | undefined;
let releaseOwnership: (() => void) | undefined;
let requestQueue = Promise.resolve<unknown>(undefined);

workerScope.onmessage = (event) => {
  const request = event.data;
  const result = requestQueue.then(() => dispatch(request));
  requestQueue = result.catch(() => undefined);

  void result.then(
    (responseResult) => {
      workerScope.postMessage({
        ok: true,
        requestId: request.requestId,
        result: responseResult,
      });
    },
    (error: unknown) => {
      workerScope.postMessage({
        error: serializeError(error),
        ok: false,
        requestId: request.requestId,
      });
    },
  );
};

async function dispatch(request: SqliteWorkerRequest): Promise<unknown> {
  switch (request.operation) {
    case "open":
      return open(request.databaseName);
    case "executeTransaction":
      return executeTransaction(request.commands);
    case "query":
      return getDatabase().exec({
        bind: request.bindings,
        returnValue: "resultRows",
        rowMode: "object",
        sql: request.sql,
      });
    case "run":
      return run(request.sql, request.bindings);
    case "close":
      return close();
  }
}

function executeTransaction(commands: readonly StorageCommand[]): readonly StorageCommandResult[] {
  if (commands.length === 0) return [];

  const openDatabase = getDatabase();
  openDatabase.exec("BEGIN");
  try {
    const results = commands.map((command): StorageCommandResult => {
      if (command.kind === "query") {
        const rows = openDatabase.exec({
          bind: command.bindings ?? [],
          returnValue: "resultRows",
          rowMode: "object",
          sql: command.sql,
        });
        return { kind: "query", rows };
      }
      return { kind: "run", ...run(command.sql, command.bindings ?? []) };
    });
    openDatabase.exec("COMMIT");
    return results;
  } catch (error) {
    try {
      openDatabase.exec("ROLLBACK");
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        "The SQLite transaction failed and could not be rolled back.",
      );
    }
    throw error;
  }
}

function run(sql: string, bindings: readonly SqliteBinding[]): StorageRunResult {
  const openDatabase = getDatabase();
  openDatabase.exec({
    bind: bindings,
    sql,
  });
  return { changes: readChangeCount(openDatabase.changes()) };
}

async function open(databaseName: string): Promise<void> {
  if (database !== undefined) throw new Error("A SQLite database is already open.");

  const release = await acquireOwnership(databaseName);
  try {
    const sqlite = await sqlitePromise;
    poolPromise ??= sqlite.installOpfsSAHPoolVfs({
      directory: poolDirectory,
      initialCapacity: poolCapacity,
      name: poolName,
    });
    const pool = await poolPromise;
    await pool.reserveMinimumCapacity(poolCapacity);

    const filename = `/byearlybird-db/${encodeURIComponent(databaseName)}.sqlite3`;
    database = new pool.OpfsSAHPoolDb(filename);
    releaseOwnership = release;
  } catch (error) {
    release();
    throw error;
  }
}

function close(): void {
  try {
    database?.close();
  } finally {
    database = undefined;
    releaseOwnership?.();
    releaseOwnership = undefined;
  }
}

function getDatabase(): Database {
  if (database === undefined) throw new Error("The SQLite database is not open.");
  return database;
}

async function acquireOwnership(databaseName: string): Promise<() => void> {
  if (workerScope.navigator.locks === undefined) {
    throw new Error("SQLite OPFS requires the Web Locks API.");
  }

  let release!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });

  let markAcquired!: (release: () => void) => void;
  let rejectAcquisition!: (reason: unknown) => void;
  const acquired = new Promise<() => void>((resolve, reject) => {
    markAcquired = resolve;
    rejectAcquisition = reject;
  });

  const lockRequest = workerScope.navigator.locks.request(
    poolOwnershipLock,
    { ifAvailable: true, mode: "exclusive" },
    async (lock) => {
      if (lock === null) {
        throw new Error(
          `SQLite OPFS storage is already in use; database "${databaseName}" cannot be opened.`,
        );
      }
      markAcquired(release);
      await released;
    },
  );
  void lockRequest.catch(rejectAcquisition);

  return acquired;
}

function serializeError(error: unknown): {
  message: string;
  name: string;
  stack?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      ...(error.stack === undefined ? {} : { stack: error.stack }),
    };
  }
  return { message: String(error), name: "Error" };
}
