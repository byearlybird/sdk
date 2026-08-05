import { afterEach, describe, expect, expectTypeOf, it, vi } from "vite-plus/test";
import { createDatabase } from "../src/database.ts";
import type { Database, DatabaseChange, DatabaseEntry, DatabasePatch } from "../src/database.ts";
import type { SyncChange } from "../src/sync.ts";
import { createNodeStorageAdapter } from "./node-storage.ts";

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
  const pending = database.getPendingChanges(100);
  expectTypeOf(habit).toEqualTypeOf<Promise<TestSchema["habits"] | null>>();
  expectTypeOf(settings).toEqualTypeOf<Promise<DatabaseEntry<TestSchema["settings"]>[]>>();
  expectTypeOf(queried).toEqualTypeOf<Promise<DatabaseEntry<TestSchema["habits"]>[]>>();
  expectTypeOf(pending).toEqualTypeOf<Promise<SyncChange[]>>();
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

const databases: Database<unknown>[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
  vi.unstubAllGlobals();
});

function createTestDatabase<Schema>(): Database<Schema> {
  const database = createDatabase<Schema>({
    name: crypto.randomUUID(),
    storage: createNodeStorageAdapter(),
  });
  databases.push(database as Database<unknown>);
  return database;
}

describe("createDatabase", () => {
  it("rejects empty names synchronously", () => {
    expect(() =>
      createDatabase<TestSchema>({ name: "  ", storage: createNodeStorageAdapter() }),
    ).toThrow("cannot be empty");
  });

  it("initializes synchronization state and exposes readiness", async () => {
    const database = createTestDatabase<TestSchema>();
    await expect(database.ready).resolves.toBeUndefined();
    await expect(database.getPendingChanges(100)).resolves.toEqual([]);
  });

  it("inserts, reads, queries, and shallowly patches typed documents", async () => {
    const database = createTestDatabase<TestSchema>();
    await database.insert("habits", "habit-1", {
      effort: 2,
      frequency: "daily",
      name: "Read",
      tags: ["health"],
    });
    await database.insert("habits", "habit-2", { frequency: "weekly", name: "Run" });
    await expect(
      database.patch("habits", "habit-1", {
        frequency: "weekly",
        metadata: { source: "manual" },
        note: null,
      }),
    ).resolves.toBe(true);

    await expect(database.get("habits", "habit-1")).resolves.toEqual({
      effort: 2,
      frequency: "weekly",
      metadata: { source: "manual" },
      name: "Read",
      note: null,
      tags: ["health"],
    });
    await expect(
      database.query("habits", (query) => ({
        orderBy: [query.asc("name")],
        where: query.and(query.eq("frequency", "weekly"), query.includes("tags", "health")),
      })),
    ).resolves.toEqual([
      {
        data: {
          effort: 2,
          frequency: "weekly",
          metadata: { source: "manual" },
          name: "Read",
          note: null,
          tags: ["health"],
        },
        id: "habit-1",
      },
    ]);
  });

  it("keeps existing CRUD outcomes and publishes committed changes", async () => {
    const database = createTestDatabase<TestSchema>();
    const listener = vi.fn<(change: DatabaseChange<TestSchema>) => void>();
    database.onChange(listener);

    await expect(database.patch("habits", "missing", { name: "Run" })).resolves.toBe(false);
    await expect(database.patch("habits", "missing", {})).resolves.toBe(false);
    await expect(database.delete("habits", "missing")).resolves.toBe(false);
    await database.insert("habits", "habit-1", { frequency: "daily", name: "Read" });
    await expect(database.patch("habits", "habit-1", {})).resolves.toBe(true);
    await expect(database.patch("habits", "habit-1", { frequency: "weekly" })).resolves.toBe(true);
    await expect(database.delete("habits", "habit-1")).resolves.toBe(true);
    await expect(database.delete("habits", "habit-1")).resolves.toBe(false);

    expect(listener.mock.calls).toEqual([
      [{ collection: "habits", id: "habit-1", operation: "insert" }],
      [{ collection: "habits", id: "habit-1", operation: "update" }],
      [{ collection: "habits", id: "habit-1", operation: "delete" }],
    ]);
    await expect(database.get("habits", "habit-1")).resolves.toBeNull();
    await expect(database.getAll("habits")).resolves.toEqual([]);
  });

  it("recreates a tombstoned ID but rejects insertion over a live entity", async () => {
    const database = createTestDatabase<TestSchema>();
    await database.insert("settings", "app", { theme: "dark" });
    await expect(database.insert("settings", "app", { theme: "light" })).rejects.toThrow(
      "already exists",
    );
    await database.delete("settings", "app");
    await database.insert("settings", "app", { theme: "light" });
    await expect(database.get("settings", "app")).resolves.toEqual({ theme: "light" });
  });

  it("rejects invalid queries before storage access", async () => {
    const database = createTestDatabase<TestSchema>();
    await expect(database.query("habits", () => ({ limit: -1 }))).rejects.toThrow(
      "nonnegative safe integer",
    );
    await expect(
      database.query("habits", (query) => ({ where: query.in("effort", null as never) })),
    ).rejects.toThrow('operator "in" requires an array');
  });

  it("rejects non-serializable entities without creating changes", async () => {
    const database = createTestDatabase<{ values: unknown }>();
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    for (const value of [undefined, Number.NaN, { missing: undefined }, new Date(), cyclic]) {
      await expect(database.insert("values", "invalid", value)).rejects.toThrow(
        "JSON-serializable",
      );
    }
    await expect(database.getPendingChanges(100)).resolves.toEqual([]);
  });

  it("isolates listener errors from writes and other listeners", async () => {
    const listenerError = new Error("Listener failed.");
    const reportErrorMock = vi.fn();
    vi.stubGlobal("reportError", reportErrorMock);
    const database = createTestDatabase<TestSchema>();
    const secondListener = vi.fn<(change: DatabaseChange<TestSchema>) => void>();
    database.onChange(() => {
      throw listenerError;
    });
    database.onChange(secondListener);

    await database.insert("settings", "app", { theme: "dark" });
    expect(reportErrorMock).toHaveBeenCalledWith(listenerError);
    expect(secondListener).toHaveBeenCalledWith({
      collection: "settings",
      id: "app",
      operation: "insert",
    });
  });

  it("closes once and rejects later operations", async () => {
    const database = createTestDatabase<TestSchema>();
    await database.close();
    await database.close();
    await expect(database.getAll("habits")).rejects.toThrow("closed");
  });
});
