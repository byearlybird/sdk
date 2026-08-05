import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vite-plus/test";
import { createDatabase } from "../src/database.ts";
import type { Database, DatabaseChange } from "../src/database.ts";
import type { StorageAdapter, StorageCommandResult, StorageConnection } from "../src/storage.ts";

type TestSchema = {
  habits: {
    frequency: "daily" | "weekly";
    name: string;
  };
  settings: {
    theme: "dark" | "light";
  };
};

function assertBatchInference(database: Database<TestSchema>): void {
  const batch = database.batch((mutation) => {
    mutation.insert("habits", "habit-2", { frequency: "weekly", name: "Run" });
    mutation.patch("habits", "habit-1", { frequency: "weekly" });
    mutation.delete("settings", "app");
  });
  expectTypeOf(batch).toEqualTypeOf<Promise<void>>();

  void database.batch((mutation) => {
    // @ts-expect-error Batch inserts are typed for the selected collection.
    mutation.insert("habits", "habit-2", { theme: "dark" });
  });
}

expectTypeOf(assertBatchInference).toBeFunction();

let storage: StorageAdapter;
let executeTransaction: ReturnType<typeof vi.fn<StorageConnection["executeTransaction"]>>;
let run: ReturnType<typeof vi.fn<StorageConnection["run"]>>;

beforeEach(() => {
  const query = vi.fn<StorageConnection["query"]>().mockResolvedValue([]);
  run = vi.fn<StorageConnection["run"]>().mockResolvedValue({ changes: 0 });
  const close = vi.fn<StorageConnection["close"]>().mockResolvedValue();
  executeTransaction = vi.fn<StorageConnection["executeTransaction"]>().mockResolvedValue([]);
  const connection: StorageConnection = { close, executeTransaction, query, run };
  storage = { open: vi.fn<StorageAdapter["open"]>().mockResolvedValue(connection) };
});

function createTestDatabase<Schema>(): Database<Schema> {
  return createDatabase<Schema>({ name: "test", storage });
}

describe("database.batch", () => {
  it("atomically executes mutations in invocation order", async () => {
    executeTransaction.mockResolvedValueOnce([
      { changes: 1, kind: "run" },
      { changes: 1, kind: "run" },
      { changes: 0, kind: "run" },
      { kind: "query", rows: [{ entity_id: "habit-3" }] },
    ]);
    const database = createTestDatabase<TestSchema>();

    await expect(
      database.batch((mutation) => {
        mutation.insert("habits", "habit-2", { frequency: "weekly", name: "Run" });
        mutation.patch("habits", "habit-1", { frequency: "weekly" });
        mutation.delete("settings", "missing");
        mutation.patch("habits", "habit-3", {});
      }),
    ).resolves.toBeUndefined();

    expect(executeTransaction).toHaveBeenCalledOnce();
    const [commands] = executeTransaction.mock.calls[0] ?? [];
    expect(commands).toHaveLength(4);
    expect(commands?.map(({ kind }) => kind)).toEqual(["run", "run", "run", "query"]);
    expect(commands?.[0]?.sql).toContain("INSERT INTO entities");
    expect(commands?.[0]?.bindings).toEqual([
      "habits",
      "habit-2",
      '{"frequency":"weekly","name":"Run"}',
    ]);
    expect(commands?.[1]?.sql).toContain("UPDATE entities");
    expect(commands?.[2]?.sql).toContain("DELETE FROM entities");
    expect(commands?.[3]?.sql).toContain("SELECT entity_id");
  });

  it("publishes changes only after the transaction commits", async () => {
    let finishTransaction!: (results: readonly StorageCommandResult[]) => void;
    executeTransaction.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishTransaction = resolve;
        }),
    );
    const database = createTestDatabase<TestSchema>();
    const listener = vi.fn<(change: DatabaseChange<TestSchema>) => void>();
    database.onChange(listener);

    const batch = database.batch((mutation) => {
      mutation.insert("habits", "habit-2", { frequency: "weekly", name: "Run" });
      mutation.patch("habits", "habit-1", { name: "Read more" });
      mutation.delete("settings", "missing");
    });
    await vi.waitFor(() => expect(executeTransaction).toHaveBeenCalledOnce());
    expect(listener).not.toHaveBeenCalled();

    finishTransaction([
      { changes: 1, kind: "run" },
      { changes: 1, kind: "run" },
      { changes: 0, kind: "run" },
    ]);
    await expect(batch).resolves.toBeUndefined();
    expect(listener.mock.calls).toEqual([
      [{ collection: "habits", id: "habit-2", operation: "insert" }],
      [{ collection: "habits", id: "habit-1", operation: "update" }],
    ]);
  });

  it("does not publish changes when the transaction fails", async () => {
    executeTransaction.mockRejectedValueOnce(new Error("Transaction failed."));
    const database = createTestDatabase<TestSchema>();
    const listener = vi.fn<(change: DatabaseChange<TestSchema>) => void>();
    database.onChange(listener);

    await expect(
      database.batch((mutation) => {
        mutation.insert("habits", "habit-2", { frequency: "weekly", name: "Run" });
        mutation.delete("settings", "app");
      }),
    ).rejects.toThrow("Transaction failed.");

    expect(listener).not.toHaveBeenCalled();
  });

  it("validates every mutation before starting the transaction", async () => {
    const database = createTestDatabase<{ values: unknown }>();

    await expect(
      database.batch((mutation) => {
        mutation.insert("values", "valid", { count: 1 });
        mutation.insert("values", "invalid", { value: undefined });
      }),
    ).rejects.toThrow("JSON-serializable");

    expect(executeTransaction).not.toHaveBeenCalled();
  });

  it("accepts an empty batch without opening a transaction", async () => {
    const database = createTestDatabase<TestSchema>();

    await expect(database.batch(() => undefined)).resolves.toBeUndefined();

    expect(executeTransaction).not.toHaveBeenCalled();
  });

  it("executes a single mutation without opening a transaction", async () => {
    const database = createTestDatabase<TestSchema>();

    await database.batch((mutation) => {
      mutation.delete("settings", "app");
    });

    expect(executeTransaction).not.toHaveBeenCalled();
    expect(run.mock.calls[1]?.[0]).toContain("DELETE FROM entities");
    expect(run.mock.calls[1]?.[1]).toEqual(["settings", "app"]);
  });

  it("rejects callbacks that return a value", async () => {
    const database = createTestDatabase<TestSchema>();

    await expect(
      database.batch((mutation) => [mutation.delete("settings", "app")]),
    ).rejects.toThrow("must not return a value");

    expect(run).toHaveBeenCalledOnce();
    expect(executeTransaction).not.toHaveBeenCalled();
  });

  it("rejects async callbacks and mutations added after collection", async () => {
    const database = createTestDatabase<TestSchema>();
    let mutateAfterBatch = (): void => undefined;

    await expect(
      database.batch(async (mutation) => {
        await Promise.resolve();
        mutation.delete("settings", "app");
      }),
    ).rejects.toThrow("must be synchronous");
    await database.batch((mutation) => {
      mutateAfterBatch = () => mutation.delete("settings", "app");
    });

    expect(mutateAfterBatch).toThrow(
      "Database batch mutations can only be added inside the batch callback.",
    );
  });
});
