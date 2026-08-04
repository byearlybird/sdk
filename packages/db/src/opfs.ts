import type {
  SqliteBinding,
  SqliteRow,
  StorageAdapter,
  StorageConnection,
  StorageRunResult,
} from "./storage.ts";

type WorkerCommand =
  | { databaseName: string; operation: "open" }
  | { bindings: readonly SqliteBinding[]; operation: "query"; sql: string }
  | { bindings: readonly SqliteBinding[]; operation: "run"; sql: string }
  | { operation: "close" };

export type SqliteWorkerRequest = WorkerCommand & { requestId: number };

export type SqliteWorkerResponse =
  | { ok: true; requestId: number; result: unknown }
  | {
      error: { message: string; name: string; stack?: string };
      ok: false;
      requestId: number;
    };

type PendingRequest = {
  reject(reason: unknown): void;
  resolve(value: unknown): void;
};

export const opfsStorageAdapter: StorageAdapter = {
  open: openSqliteOpfs,
};

export async function openSqliteOpfs(databaseName: string): Promise<StorageConnection> {
  if (databaseName.trim().length === 0) {
    throw new TypeError("The SQLite database name cannot be empty.");
  }

  const worker = new Worker(new URL("./opfs.worker.mjs", import.meta.url), {
    type: "module",
  });
  const pending = new Map<number, PendingRequest>();
  let nextRequestId = 0;
  let closed = false;
  let failure: Error | undefined;
  let closePromise: Promise<void> | undefined;

  function fail(error: Error): void {
    failure ??= error;
    for (const request of pending.values()) request.reject(failure);
    pending.clear();
  }

  function failWorker(error: Error): void {
    worker.terminate();
    fail(error);
  }

  worker.addEventListener("message", (event: MessageEvent<SqliteWorkerResponse>) => {
    const response = event.data;
    const request = pending.get(response.requestId);
    if (!request) return;

    pending.delete(response.requestId);
    if (response.ok) {
      request.resolve(response.result);
    } else {
      const error = new Error(response.error.message);
      error.name = response.error.name;
      if (response.error.stack !== undefined) error.stack = response.error.stack;
      request.reject(error);
    }
  });
  worker.addEventListener("error", (event) => {
    failWorker(new Error(event.message || "The SQLite worker failed."));
  });
  worker.addEventListener("messageerror", () => {
    failWorker(new Error("The SQLite worker returned an unreadable response."));
  });

  function request<TResult>(command: WorkerCommand): Promise<TResult> {
    if (failure !== undefined) return Promise.reject(failure);

    const requestId = ++nextRequestId;
    const result = new Promise<TResult>((resolve, reject) => {
      pending.set(requestId, {
        reject,
        resolve: resolve as (value: unknown) => void,
      });
    });

    try {
      worker.postMessage({ ...command, requestId } satisfies SqliteWorkerRequest);
    } catch (error) {
      pending.delete(requestId);
      return Promise.reject(error);
    }

    return result;
  }

  try {
    await request<void>({ databaseName, operation: "open" });
  } catch (error) {
    worker.terminate();
    fail(error instanceof Error ? error : new Error(String(error)));
    throw error;
  }

  return {
    query: (sql, bindings = []) => {
      if (closed) return Promise.reject(new Error("The SQLite database is closed."));
      return request<SqliteRow[]>({ bindings, operation: "query", sql });
    },
    run: (sql, bindings = []) => {
      if (closed) return Promise.reject(new Error("The SQLite database is closed."));
      return request<StorageRunResult>({ bindings, operation: "run", sql });
    },
    close: () => {
      closePromise ??= (async () => {
        closed = true;
        try {
          await request<void>({ operation: "close" });
        } finally {
          worker.terminate();
          fail(new Error("The SQLite worker was terminated."));
        }
      })();
      return closePromise;
    },
  };
}
