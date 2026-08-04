import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { openSqliteOpfs } from "../src/opfs.ts";
import type { SqliteWorkerRequest, SqliteWorkerResponse } from "../src/opfs.ts";

class MockWorker extends EventTarget {
  static instances: MockWorker[] = [];

  readonly requests: SqliteWorkerRequest[] = [];
  terminated = false;

  constructor() {
    super();
    MockWorker.instances.push(this);
  }

  postMessage(request: SqliteWorkerRequest): void {
    this.requests.push(request);
    const result =
      request.operation === "query"
        ? [{ message: "hello" }]
        : request.operation === "run"
          ? { changes: 1 }
          : undefined;

    queueMicrotask(() => {
      this.dispatchEvent(
        new MessageEvent<SqliteWorkerResponse>("message", {
          data: { ok: true, requestId: request.requestId, result },
        }),
      );
    });
  }

  terminate(): void {
    this.terminated = true;
  }
}

afterEach(() => {
  MockWorker.instances = [];
  vi.unstubAllGlobals();
});

describe("openSqliteOpfs", () => {
  it("rejects empty database names without starting a worker", async () => {
    vi.stubGlobal("Worker", MockWorker);

    await expect(openSqliteOpfs("  ")).rejects.toThrow("cannot be empty");
    expect(MockWorker.instances).toHaveLength(0);
  });

  it("opens, queries, runs statements, and closes the worker", async () => {
    vi.stubGlobal("Worker", MockWorker);

    const database = await openSqliteOpfs("habits");
    const rows = await database.query("SELECT 'hello' AS message");
    const result = await database.run("DELETE FROM habits WHERE id = ?", ["habit-1"]);
    await database.close();
    await database.close();

    const [worker] = MockWorker.instances;
    expect(rows).toEqual([{ message: "hello" }]);
    expect(worker?.requests).toMatchObject([
      { databaseName: "habits", operation: "open" },
      {
        bindings: [],
        operation: "query",
        sql: "SELECT 'hello' AS message",
      },
      {
        bindings: ["habit-1"],
        operation: "run",
        sql: "DELETE FROM habits WHERE id = ?",
      },
      { operation: "close" },
    ]);
    expect(result).toEqual({ changes: 1 });
    expect(worker?.terminated).toBe(true);
  });

  it("remembers fatal worker failures", async () => {
    vi.stubGlobal("Worker", MockWorker);
    const database = await openSqliteOpfs("habits");
    const [worker] = MockWorker.instances;
    const errorEvent = Object.assign(new Event("error"), { message: "Worker crashed." });

    worker?.dispatchEvent(errorEvent);

    expect(worker?.terminated).toBe(true);
    await expect(database.query("SELECT 1")).rejects.toThrow("Worker crashed.");
    await expect(database.run("DELETE FROM habits")).rejects.toThrow("Worker crashed.");
    await expect(database.close()).rejects.toThrow("Worker crashed.");
    expect(worker?.terminated).toBe(true);
  });
});
