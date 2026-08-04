import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vite-plus/test";
import { createDatabase } from "../src/database.ts";
import type { Database, DatabaseChange, DatabaseEntry, DatabasePatch } from "../src/database.ts";
import type { StorageAdapter, StorageConnection } from "../src/storage.ts";

type TestSchema = {
  habits: {
    active?: boolean;
    effort?: null | number;
    frequency: "daily" | "weekly";
    metadata?: {
      source: string;
    };
    name: string;
    note?: null | string;
    tags?: string[];
  };
  settings: {
    theme: "dark" | "light";
  };
};

function assertSchemaInference(database: Database<TestSchema>): void {
  const habit = database.get("habits", "habit-1");
  const settings = database.getAll("settings");
  const queried = database.query("habits", (query) => ({
    orderBy: [query.asc("name")],
    where: query.and(
      query.eq("frequency", "daily"),
      query.includes("tags", "health"),
      query.gte("effort", 1),
      query.eq("id", "habit-1"),
    ),
  }));
  expectTypeOf(habit).toEqualTypeOf<Promise<TestSchema["habits"] | null>>();
  expectTypeOf(settings).toEqualTypeOf<Promise<DatabaseEntry<TestSchema["settings"]>[]>>();
  expectTypeOf(queried).toEqualTypeOf<Promise<DatabaseEntry<TestSchema["habits"]>[]>>();
  expectTypeOf<DatabasePatch<TestSchema["habits"]>>().toEqualTypeOf<
    Partial<TestSchema["habits"]>
  >();
  expectTypeOf<DatabasePatch<{ value: string | undefined }>>().toEqualTypeOf<{
    value?: string;
  }>();
  const unsubscribe = database.onChange((change) => {
    expectTypeOf(change).toEqualTypeOf<DatabaseChange<TestSchema>>();
    expectTypeOf(change.collection).toEqualTypeOf<"habits" | "settings">();
  });
  expectTypeOf(unsubscribe).toEqualTypeOf<() => void>();

  void database.insert("habits", "habit-1", { frequency: "daily", name: "Read" });
  void database.patch("habits", "habit-1", { frequency: "weekly" });
  // @ts-expect-error The document must match the selected collection.
  void database.insert("habits", "habit-1", { theme: "dark" });
  // @ts-expect-error Patch fields must belong to the selected collection.
  void database.patch("habits", "habit-1", { theme: "dark" });
  // @ts-expect-error JSON patches cannot contain explicit undefined values.
  void database.patch("habits", "habit-1", { note: undefined });
  void database.query("habits", (query) => ({
    // @ts-expect-error Equality values are inferred from the selected field.
    where: query.eq("frequency", "monthly"),
  }));
  void database.query("habits", (query) => ({
    // @ts-expect-error Nested object fields are not queryable.
    where: query.eq("metadata", { source: "manual" }),
  }));
  void database.query("habits", (query) => ({
    // @ts-expect-error Arrays cannot be used for scalar ordering.
    orderBy: [query.asc("tags")],
  }));
  void database.query("habits", (query) => ({
    // @ts-expect-error Scalar fields do not support array membership.
    where: query.includes("name", "Read"),
  }));
  void database.query("habits", (query) => ({
    // @ts-expect-error Unknown fields are rejected.
    where: query.eq("missing", "value"),
  }));
  // @ts-expect-error The collection must be a key in TestSchema.
  void database.get("missing", "entity-1");
}

expectTypeOf(assertSchemaInference).toBeFunction();

let storage: StorageAdapter;
let sqlite: StorageConnection;
let open: ReturnType<typeof vi.fn<StorageAdapter["open"]>>;
let query: ReturnType<typeof vi.fn<StorageConnection["query"]>>;
let run: ReturnType<typeof vi.fn<StorageConnection["run"]>>;
let close: ReturnType<typeof vi.fn<StorageConnection["close"]>>;

beforeEach(() => {
  query = vi.fn<StorageConnection["query"]>().mockResolvedValue([]);
  run = vi.fn<StorageConnection["run"]>().mockResolvedValue({ changes: 0 });
  close = vi.fn<StorageConnection["close"]>().mockResolvedValue();
  sqlite = { close, query, run };
  open = vi.fn<StorageAdapter["open"]>().mockResolvedValue(sqlite);
  storage = { open };
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function createTestDatabase<Schema>(): Database<Schema> {
  return createDatabase<Schema>({ name: "test", storage });
}

describe("createDatabase", () => {
  it("rejects empty names synchronously", () => {
    expect(() => createDatabase<TestSchema>({ name: "  ", storage })).toThrow("cannot be empty");
    expect(open).not.toHaveBeenCalled();
  });

  it("creates the entities table and reads a typed document", async () => {
    query.mockResolvedValueOnce([{ entity: '{"frequency":"daily","name":"Read"}' }]);
    const database = createTestDatabase<TestSchema>();

    const habit = await database.get("habits", "habit-1");

    expectTypeOf(habit).toEqualTypeOf<TestSchema["habits"] | null>();
    expect(habit).toEqual({ frequency: "daily", name: "Read" });
    expect(open).toHaveBeenCalledWith("test");
    expect(run.mock.calls[0]?.[0]).toContain("CREATE TABLE IF NOT EXISTS entities");
    expect(query.mock.calls[0]?.[1]).toEqual(["habits", "habit-1"]);
  });

  it("exposes initialization readiness", async () => {
    const database = createTestDatabase<TestSchema>();

    await expect(database.ready).resolves.toBeUndefined();

    expect(open).toHaveBeenCalledWith("test");
    expect(run).toHaveBeenCalledOnce();
  });

  it("returns IDs and typed data from a collection", async () => {
    query.mockResolvedValueOnce([
      {
        entity: '{"frequency":"daily","name":"Read"}',
        entity_id: "habit-1",
      },
      {
        entity: '{"frequency":"weekly","name":"Run"}',
        entity_id: "habit-2",
      },
    ]);
    const database = createTestDatabase<TestSchema>();

    const habits = await database.getAll("habits");

    expectTypeOf(habits).toEqualTypeOf<DatabaseEntry<TestSchema["habits"]>[]>();
    expect(habits).toEqual([
      { data: { frequency: "daily", name: "Read" }, id: "habit-1" },
      { data: { frequency: "weekly", name: "Run" }, id: "habit-2" },
    ]);
    expect(query.mock.calls[0]?.[1]).toEqual(["habits"]);
  });

  it("executes typed collection queries and returns matching entries", async () => {
    query.mockResolvedValueOnce([
      {
        entity: '{"frequency":"daily","name":"Read","tags":["health"]}',
        entity_id: "habit-1",
      },
    ]);
    const database = createTestDatabase<TestSchema>();

    const result = await database.query("habits", (query) => ({
      limit: 2,
      offset: 1,
      orderBy: [query.desc("name")],
      where: query.and(query.eq("frequency", "daily"), query.includes("tags", "health")),
    }));

    expect(result).toEqual([
      {
        data: { frequency: "daily", name: "Read", tags: ["health"] },
        id: "habit-1",
      },
    ]);
    expect(query.mock.calls[0]?.[0]).toContain("FROM entities");
    expect(query.mock.calls[0]?.[0]).toContain("json_each");
    expect(query.mock.calls[0]?.[0]).toContain("entities.entity_id ASC");
    expect(query.mock.calls[0]?.[1]).toEqual([
      "habits",
      "frequency",
      "daily",
      "tags",
      "health",
      "name",
      2,
      1,
    ]);
  });

  it("validates query definitions before executing SQL", async () => {
    const database = createTestDatabase<TestSchema>();

    await expect(database.query("habits", () => ({ limit: -1 }))).rejects.toThrow(
      "Query limit must be a nonnegative safe integer.",
    );
    await expect(
      database.query("habits", (query) => ({
        where: query.in("effort", null as never),
      })),
    ).rejects.toThrow('Query operator "in" requires an array.');

    expect(query).not.toHaveBeenCalled();
    expect(run).toHaveBeenCalledOnce();
  });

  it("inserts complete JSON documents without upserting", async () => {
    const database = createTestDatabase<TestSchema>();

    await database.insert("settings", "app", { theme: "dark" });

    expect(run.mock.calls[1]?.[0]).toContain("INSERT INTO entities");
    expect(run.mock.calls[1]?.[0]).not.toContain("ON CONFLICT");
    expect(run.mock.calls[1]?.[1]).toEqual(["settings", "app", '{"theme":"dark"}']);
  });

  it("notifies subscribers after successful mutations", async () => {
    run
      .mockResolvedValueOnce({ changes: 0 })
      .mockResolvedValueOnce({ changes: 1 })
      .mockResolvedValueOnce({ changes: 1 })
      .mockResolvedValueOnce({ changes: 1 });
    const database = createTestDatabase<TestSchema>();
    const listener = vi.fn<(change: DatabaseChange<TestSchema>) => void>();
    database.onChange(listener);

    await database.insert("habits", "habit-1", { frequency: "daily", name: "Read" });
    await database.patch("habits", "habit-1", { frequency: "weekly" });
    await database.delete("habits", "habit-1");

    expect(listener.mock.calls).toEqual([
      [{ collection: "habits", id: "habit-1", operation: "insert" }],
      [{ collection: "habits", id: "habit-1", operation: "update" }],
      [{ collection: "habits", id: "habit-1", operation: "delete" }],
    ]);
  });

  it("does not notify subscribers when no data changes", async () => {
    query.mockResolvedValueOnce([{ entity_id: "habit-1" }]);
    const database = createTestDatabase<TestSchema>();
    const listener = vi.fn<(change: DatabaseChange<TestSchema>) => void>();
    database.onChange(listener);

    await database.patch("habits", "habit-1", {});
    await database.patch("habits", "missing", { name: "Run" });
    await database.delete("habits", "missing");
    run.mockRejectedValueOnce(new Error("Write failed."));
    await expect(database.insert("settings", "app", { theme: "dark" })).rejects.toThrow(
      "Write failed.",
    );

    expect(listener).not.toHaveBeenCalled();
  });

  it("supports idempotent unsubscription", async () => {
    const database = createTestDatabase<TestSchema>();
    const listener = vi.fn<(change: DatabaseChange<TestSchema>) => void>();
    const unsubscribe = database.onChange(listener);

    unsubscribe();
    unsubscribe();
    await database.insert("settings", "app", { theme: "dark" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("isolates listener errors from writes and other subscribers", async () => {
    const listenerError = new Error("Listener failed.");
    const reportErrorMock = vi.fn();
    vi.stubGlobal("reportError", reportErrorMock);
    const database = createTestDatabase<TestSchema>();
    const secondListener = vi.fn<(change: DatabaseChange<TestSchema>) => void>();
    database.onChange(() => {
      throw listenerError;
    });
    database.onChange(secondListener);

    await expect(database.insert("settings", "app", { theme: "dark" })).resolves.toBeUndefined();

    expect(reportErrorMock).toHaveBeenCalledWith(listenerError);
    expect(secondListener).toHaveBeenCalledWith({
      collection: "settings",
      id: "app",
      operation: "insert",
    });
  });

  it("atomically applies shallow patches", async () => {
    run.mockResolvedValueOnce({ changes: 0 }).mockResolvedValueOnce({ changes: 1 });
    const database = createTestDatabase<TestSchema>();

    await expect(
      database.patch("habits", "habit-1", {
        frequency: "weekly",
        metadata: { source: "manual" },
        note: null,
      }),
    ).resolves.toBe(true);

    expect(run.mock.calls[1]?.[0]).toContain("json_set");
    expect(run.mock.calls[1]?.[0]).not.toContain("RETURNING");
    expect(run.mock.calls[1]?.[1]).toEqual([
      "frequency",
      '"weekly"',
      "metadata",
      '{"source":"manual"}',
      "note",
      "null",
      "habits",
      "habit-1",
    ]);
  });

  it("returns false when patching a missing document", async () => {
    const database = createTestDatabase<TestSchema>();

    await expect(database.patch("habits", "missing", { name: "Run" })).resolves.toBe(false);
  });

  it("treats an empty patch as an existence check", async () => {
    query.mockResolvedValueOnce([{ entity_id: "habit-1" }]);
    const database = createTestDatabase<TestSchema>();

    await expect(database.patch("habits", "habit-1", {})).resolves.toBe(true);

    expect(query.mock.calls[0]?.[0]).toContain("SELECT entity_id");
    expect(query.mock.calls[0]?.[1]).toEqual(["habits", "habit-1"]);
  });

  it("reports whether a document was deleted", async () => {
    run
      .mockResolvedValueOnce({ changes: 0 })
      .mockResolvedValueOnce({ changes: 1 })
      .mockResolvedValueOnce({ changes: 0 });
    const database = createTestDatabase<TestSchema>();

    await expect(database.delete("habits", "habit-1")).resolves.toBe(true);
    await expect(database.delete("habits", "missing")).resolves.toBe(false);
    expect(run.mock.calls[1]?.[0]).not.toContain("RETURNING");
  });

  it("returns null for a missing document", async () => {
    const database = createTestDatabase<TestSchema>();

    await expect(database.get("habits", "missing")).resolves.toBeNull();
  });

  it("rejects non-serializable entities", async () => {
    const database = createTestDatabase<{ values: unknown }>();

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    for (const value of [
      undefined,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      { missing: undefined },
      Array(1),
      new Date(),
      cyclic,
    ]) {
      await expect(database.insert("values", "invalid", value)).rejects.toThrow(
        "JSON-serializable",
      );
    }

    expect(run).toHaveBeenCalledOnce();
  });

  it("closes once and rejects later operations", async () => {
    const database = createTestDatabase<TestSchema>();

    await database.close();
    await database.close();

    expect(close).toHaveBeenCalledOnce();
    await expect(database.getAll("habits")).rejects.toThrow("closed");
  });
});
