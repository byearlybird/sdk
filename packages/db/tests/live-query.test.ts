import { afterEach, describe, expect, expectTypeOf, it, vi } from "vite-plus/test";
import type { CollectionName, Database, DatabaseChange, DatabaseEntry } from "../src/database.ts";
import { createQuery } from "../src/live-query.ts";
import type { DatabaseQuery, QueryDatabase } from "../src/live-query.ts";

type TestSchema = {
  projects: {
    name: string;
  };
  tasks: {
    title: string;
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createQuery", () => {
  it("loads immediately and reruns only for automatically tracked collections", async () => {
    const fixture = createDatabaseFixture();
    fixture.set("tasks", [{ data: { title: "First" }, id: "task-1" }]);
    const load = vi.fn(async (database: QueryDatabase<TestSchema>) => database.getAll("tasks"));
    const query = createQuery(fixture.database, load);
    const listener = vi.fn();

    await expect(readQuery(query)).resolves.toEqual([{ data: { title: "First" }, id: "task-1" }]);
    const unsubscribe = query.subscribe(listener);
    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
    listener.mockClear();
    await expect(readQuery(query)).resolves.toEqual([{ data: { title: "First" }, id: "task-1" }]);

    fixture.emit({ collection: "projects", id: "project-1", operation: "insert" });
    await Promise.resolve();
    expect(load).toHaveBeenCalledTimes(2);

    fixture.set("tasks", [{ data: { title: "Updated" }, id: "task-1" }]);
    fixture.emit({ collection: "tasks", id: "task-1", operation: "update" });
    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());

    await expect(readQuery(query)).resolves.toEqual([{ data: { title: "Updated" }, id: "task-1" }]);
    expect(load).toHaveBeenCalledTimes(3);
    unsubscribe();
  });

  it("tracks multiple collections and replaces dependencies after each run", async () => {
    const fixture = createDatabaseFixture();
    let includeProjects = true;
    const load = vi.fn(async (database: QueryDatabase<TestSchema>) => {
      const tasks = await database.getAll("tasks");
      const projects = includeProjects ? await database.getAll("projects") : [];
      return { projects, tasks };
    });
    const query = createQuery(fixture.database, load);
    const listener = vi.fn();
    const unsubscribe = query.subscribe(listener);
    await readQuery(query);

    includeProjects = false;
    fixture.emit({ collection: "projects", id: "project-1", operation: "insert" });
    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1));

    fixture.emit({ collection: "projects", id: "project-2", operation: "insert" });
    await Promise.resolve();
    expect(listener).toHaveBeenCalledTimes(1);

    fixture.emit({ collection: "tasks", id: "task-1", operation: "insert" });
    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(2));
    unsubscribe();
  });

  it("serializes reruns and coalesces invalidations received during a load", async () => {
    const fixture = createDatabaseFixture();
    const thirdRun = deferred<void>();
    let runs = 0;
    const load = vi.fn(async (database: QueryDatabase<TestSchema>) => {
      await database.getAll("tasks");
      runs += 1;
      if (runs === 3) await thirdRun.promise;
      return runs;
    });
    const query = createQuery(fixture.database, load);
    await readQuery(query);
    const listener = vi.fn();
    const unsubscribe = query.subscribe(listener);
    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
    listener.mockClear();

    fixture.emit({ collection: "tasks", id: "task-1", operation: "insert" });
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(3));
    fixture.emit({ collection: "tasks", id: "task-2", operation: "insert" });
    fixture.emit({ collection: "tasks", id: "task-3", operation: "insert" });
    fixture.emit({ collection: "tasks", id: "task-4", operation: "insert" });
    thirdRun.resolve();

    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
    expect(load).toHaveBeenCalledTimes(4);
    await expect(readQuery(query)).resolves.toBe(4);
    unsubscribe();
  });

  it("keeps the last successful snapshot while a refresh is pending", async () => {
    const fixture = createDatabaseFixture();
    fixture.set("tasks", [{ data: { title: "First" }, id: "task-1" }]);
    let pausedRun: ReturnType<typeof deferred<void>> | undefined;
    const load = vi.fn(async (database: QueryDatabase<TestSchema>) => {
      const tasks = await database.getAll("tasks");
      await pausedRun?.promise;
      return tasks;
    });
    const query = createQuery(fixture.database, load);
    const listener = vi.fn();

    await expect(readQuery(query)).resolves.toEqual([{ data: { title: "First" }, id: "task-1" }]);
    const unsubscribe = query.subscribe(listener);
    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
    listener.mockClear();

    pausedRun = deferred<void>();
    fixture.set("tasks", [{ data: { title: "Updated" }, id: "task-1" }]);
    fixture.emit({ collection: "tasks", id: "task-1", operation: "update" });
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(3));

    expect(query.getSnapshot()).toEqual({
      status: "success",
      value: [{ data: { title: "First" }, id: "task-1" }],
    });
    expect(listener).not.toHaveBeenCalled();

    pausedRun.resolve();
    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
    expect(query.getSnapshot()).toEqual({
      status: "success",
      value: [{ data: { title: "Updated" }, id: "task-1" }],
    });
    unsubscribe();
  });

  it("publishes rejected snapshots and recovers after another relevant change", async () => {
    const fixture = createDatabaseFixture();
    const failure = new Error("Query failed.");
    let fail = false;
    const query = createQuery(fixture.database, async (database) => {
      await database.getAll("tasks");
      if (fail) throw failure;
      return "loaded";
    });
    await readQuery(query);
    const listener = vi.fn();
    const unsubscribe = query.subscribe(listener);
    await vi.waitFor(() => expect(listener).toHaveBeenCalledOnce());
    listener.mockClear();

    fail = true;
    fixture.emit({ collection: "tasks", id: "task-1", operation: "update" });
    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(1));
    await expect(readQuery(query)).rejects.toBe(failure);

    fail = false;
    fixture.emit({ collection: "tasks", id: "task-1", operation: "update" });
    await vi.waitFor(() => expect(listener).toHaveBeenCalledTimes(2));
    await expect(readQuery(query)).resolves.toBe("loaded");
    unsubscribe();
  });

  it("passes a frozen query-only database with inferred collection types", async () => {
    const fixture = createDatabaseFixture();
    const query = createQuery(fixture.database, async (database) => {
      expect(Object.isFrozen(database)).toBe(true);
      expect(Object.keys(database)).toEqual(["get", "getAll", "query"]);
      expectTypeOf(database).toEqualTypeOf<QueryDatabase<TestSchema>>();

      return database.get("tasks", "task-1");
    });

    expectTypeOf(query).toEqualTypeOf<DatabaseQuery<TestSchema["tasks"] | null>>();
    await expect(readQuery(query)).resolves.toBeNull();

    const checkTypes = () => {
      createQuery(fixture.database, async (database) => {
        // @ts-expect-error Mutations are unavailable inside query loaders.
        await database.insert("tasks", "task-1", { title: "Write tests" });
        // @ts-expect-error Unknown collection names are rejected.
        await database.getAll("missing");
      });
    };
    expect(checkTypes).toBeTypeOf("function");
  });

  it("supports idempotent unsubscription and isolates listener errors", async () => {
    const fixture = createDatabaseFixture();
    const listenerError = new Error("Listener failed.");
    const reportErrorMock = vi.fn();
    vi.stubGlobal("reportError", reportErrorMock);
    const query = createQuery(fixture.database, async (database) => database.getAll("tasks"));
    const secondListener = vi.fn();
    const unsubscribeFirst = query.subscribe(() => {
      throw listenerError;
    });
    const unsubscribeSecond = query.subscribe(secondListener);
    await readQuery(query);

    fixture.emit({ collection: "tasks", id: "task-1", operation: "insert" });
    await vi.waitFor(() => expect(secondListener).toHaveBeenCalledOnce());
    expect(reportErrorMock).toHaveBeenCalledWith(listenerError);

    unsubscribeFirst();
    unsubscribeFirst();
    unsubscribeSecond();
    await Promise.resolve();
    fixture.emit({ collection: "tasks", id: "task-2", operation: "insert" });
    await Promise.resolve();
    expect(secondListener).toHaveBeenCalledOnce();
  });
});

function createDatabaseFixture(): {
  database: Database<TestSchema>;
  emit(change: DatabaseChange<TestSchema>): void;
  set<Collection extends CollectionName<TestSchema>>(
    collection: Collection,
    entries: DatabaseEntry<TestSchema[Collection]>[],
  ): void;
} {
  const changeListeners = new Set<(change: DatabaseChange<TestSchema>) => void>();
  const entries = new Map<CollectionName<TestSchema>, DatabaseEntry<unknown>[]>([
    ["projects", []],
    ["tasks", []],
  ]);

  const get: Database<TestSchema>["get"] = async (collection, id) => {
    return (entries.get(collection)?.find((entry) => entry.id === id)?.data ?? null) as
      | TestSchema[typeof collection]
      | null;
  };
  const getAll: Database<TestSchema>["getAll"] = async (collection) => {
    return [...(entries.get(collection) ?? [])] as DatabaseEntry<TestSchema[typeof collection]>[];
  };
  const query: Database<TestSchema>["query"] = async (collection) => {
    return [...(entries.get(collection) ?? [])] as DatabaseEntry<TestSchema[typeof collection]>[];
  };

  return {
    database: {
      ready: Promise.resolve(),
      acknowledgeChanges: async () => undefined,
      applyRemoteChanges: async () => undefined,
      batch: async () => undefined,
      close: async () => undefined,
      delete: async () => false,
      get,
      getAll,
      getPendingChanges: async () => [],
      insert: async () => undefined,
      onChange: (listener) => {
        changeListeners.add(listener);
        return () => {
          changeListeners.delete(listener);
        };
      },
      patch: async () => false,
      query,
    },
    emit: (change) => {
      for (const listener of Array.from(changeListeners)) listener(change);
    },
    set: (collection, nextEntries) => {
      entries.set(collection, nextEntries);
    },
  };
}

function deferred<Value>(): {
  promise: Promise<Value>;
  resolve(value: Value): void;
} {
  let resolvePromise: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}

async function readQuery<Result>(query: DatabaseQuery<Result>): Promise<Result> {
  const snapshot = query.getSnapshot();
  if (snapshot.status === "pending") return snapshot.promise;
  if (snapshot.status === "error") throw snapshot.error;
  return snapshot.value;
}
