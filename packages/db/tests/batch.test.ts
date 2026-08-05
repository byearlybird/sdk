import { afterEach, describe, expect, expectTypeOf, it, vi } from "vite-plus/test";
import { createDatabase } from "../src/database.ts";
import type { Database, DatabaseChange } from "../src/database.ts";
import type { StorageAdapter } from "../src/storage.ts";
import { createNodeStorageAdapter } from "./node-storage.ts";

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

const databases: Database<unknown>[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
});

function createTestDatabase(
  storage: StorageAdapter = createNodeStorageAdapter(),
): Database<TestSchema> {
  const database = createDatabase<TestSchema>({ name: crypto.randomUUID(), storage });
  databases.push(database as Database<unknown>);
  return database;
}

describe("database.batch", () => {
  it("atomically applies mutations in invocation order", async () => {
    const database = createTestDatabase();
    await database.insert("habits", "habit-1", { frequency: "daily", name: "Read" });
    await database.insert("settings", "app", { theme: "dark" });

    await database.batch((mutation) => {
      mutation.patch("habits", "habit-1", { frequency: "weekly" });
      mutation.insert("habits", "habit-2", { frequency: "weekly", name: "Run" });
      mutation.delete("settings", "app");
      mutation.patch("habits", "habit-2", { name: "Run outside" });
    });

    await expect(database.getAll("habits")).resolves.toEqual([
      { data: { frequency: "weekly", name: "Read" }, id: "habit-1" },
      { data: { frequency: "weekly", name: "Run outside" }, id: "habit-2" },
    ]);
    await expect(database.get("settings", "app")).resolves.toBeNull();
    await expect(database.getPendingChanges(100)).resolves.toHaveLength(3);
  });

  it("publishes changes only after the transaction commits", async () => {
    const baseStorage = createNodeStorageAdapter();
    let releaseTransaction: (() => void) | undefined;
    let pause = false;
    const storage: StorageAdapter = {
      open: async (name) => {
        const connection = await baseStorage.open(name);
        return {
          ...connection,
          executeTransaction: async (commands) => {
            if (pause) {
              await new Promise<void>((resolve) => {
                releaseTransaction = resolve;
              });
            }
            return connection.executeTransaction(commands);
          },
        };
      },
    };
    const database = createTestDatabase(storage);
    await database.ready;
    pause = true;
    const listener = vi.fn<(change: DatabaseChange<TestSchema>) => void>();
    database.onChange(listener);

    const batch = database.batch((mutation) => {
      mutation.insert("habits", "habit-1", { frequency: "daily", name: "Read" });
      mutation.insert("settings", "app", { theme: "dark" });
    });
    await vi.waitFor(() => expect(releaseTransaction).toBeTypeOf("function"));
    expect(listener).not.toHaveBeenCalled();

    releaseTransaction?.();
    await batch;
    expect(listener.mock.calls).toEqual([
      [{ collection: "habits", id: "habit-1", operation: "insert" }],
      [{ collection: "settings", id: "app", operation: "insert" }],
    ]);
  });

  it("rolls back the complete batch and publishes nothing when commit fails", async () => {
    const baseStorage = createNodeStorageAdapter();
    let failNextTransaction = false;
    const storage: StorageAdapter = {
      open: async (name) => {
        const connection = await baseStorage.open(name);
        return {
          ...connection,
          executeTransaction: (commands) => {
            if (failNextTransaction) {
              failNextTransaction = false;
              return Promise.reject(new Error("Transaction failed."));
            }
            return connection.executeTransaction(commands);
          },
        };
      },
    };
    const database = createTestDatabase(storage);
    await database.ready;
    failNextTransaction = true;
    const listener = vi.fn<(change: DatabaseChange<TestSchema>) => void>();
    database.onChange(listener);

    await expect(
      database.batch((mutation) => {
        mutation.insert("habits", "habit-1", { frequency: "daily", name: "Read" });
        mutation.insert("settings", "app", { theme: "dark" });
      }),
    ).rejects.toThrow("Transaction failed.");

    expect(listener).not.toHaveBeenCalled();
    await expect(database.getAll("habits")).resolves.toEqual([]);
    await expect(database.getAll("settings")).resolves.toEqual([]);
    await expect(database.getPendingChanges(100)).resolves.toEqual([]);

    await database.insert("settings", "app", { theme: "light" });
    const [change] = await database.getPendingChanges(100);
    expect(change?.version.counter).toBe(1);
  });

  it("validates every input before entering the mutation queue", async () => {
    const database = createDatabase<{ values: unknown }>({
      name: crypto.randomUUID(),
      storage: createNodeStorageAdapter(),
    });
    databases.push(database as Database<unknown>);

    await expect(
      database.batch((mutation) => {
        mutation.insert("values", "valid", { count: 1 });
        mutation.insert("values", "invalid", { value: undefined });
      }),
    ).rejects.toThrow("JSON-serializable");
    await expect(database.getAll("values")).resolves.toEqual([]);
  });

  it("supports empty batches and rejects invalid callbacks", async () => {
    const database = createTestDatabase();
    await expect(database.batch(() => undefined)).resolves.toBeUndefined();
    await expect(
      database.batch((mutation) => [mutation.delete("settings", "app")]),
    ).rejects.toThrow("must not return a value");
    await expect(
      database.batch(async (mutation) => {
        await Promise.resolve();
        mutation.delete("settings", "app");
      }),
    ).rejects.toThrow("must be synchronous");
  });

  it("rejects mutations added after collection", async () => {
    const database = createTestDatabase();
    let mutateAfterBatch = (): void => undefined;
    await database.batch((mutation) => {
      mutateAfterBatch = () => mutation.delete("settings", "app");
    });
    expect(mutateAfterBatch).toThrow(
      "Database batch mutations can only be added inside the batch callback.",
    );
  });
});
