import { afterEach, describe, expect, expectTypeOf, it } from "vite-plus/test";
import {
  createDatabase,
  createInMemorySyncRelay,
  createInMemorySynchronizer,
} from "../src/index.ts";
import type { Database, SyncChange, Synchronizer } from "../src/index.ts";
import { createNodeStorageAdapter } from "./node-storage.ts";

type TestSchema = {
  tasks: {
    title: string;
  };
};

type LiveSyncChange = Extract<SyncChange, { deleted: false }>;

const databases: Database<TestSchema>[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
});

function createReplica(): Database<TestSchema> {
  const database = createDatabase<TestSchema>({
    name: crypto.randomUUID(),
    storage: createNodeStorageAdapter(),
  });
  databases.push(database);
  return database;
}

function createChange(id: string): LiveSyncChange {
  return {
    changeId: `change-${id}`,
    collection: "tasks",
    deleted: false,
    entity: { title: id },
    entityId: id,
    format: 1,
    version: { counter: 1, replicaId: "test" },
  };
}

describe("createInMemorySynchronizer", () => {
  it("synchronizes multiple local databases through one shared relay", async () => {
    const relay = createInMemorySyncRelay();
    const first = createReplica();
    const second = createReplica();
    const firstSynchronizer = createInMemorySynchronizer(first, relay);
    const secondSynchronizer = createInMemorySynchronizer(second, relay);

    expectTypeOf(firstSynchronizer).toEqualTypeOf<Synchronizer>();

    await first.insert("tasks", "first", { title: "First" });
    await firstSynchronizer.sync();
    await secondSynchronizer.sync();

    await second.insert("tasks", "second", { title: "Second" });
    await secondSynchronizer.sync();
    await firstSynchronizer.sync();

    const expected = [
      { data: { title: "First" }, id: "first" },
      { data: { title: "Second" }, id: "second" },
    ];
    await expect(first.getAll("tasks")).resolves.toEqual(expected);
    await expect(second.getAll("tasks")).resolves.toEqual(expected);
    await expect(first.getPendingChanges(100)).resolves.toEqual([]);
    await expect(second.getPendingChanges(100)).resolves.toEqual([]);
  });

  it("paginates changes and deduplicates retries", async () => {
    const relay = createInMemorySyncRelay();
    const first = createChange("first");
    const second = createChange("second");

    await relay.push({ changes: [first, second] });
    await relay.push({ changes: [first] });

    const firstPage = await relay.pull({ cursor: null, limit: 1 });
    const secondPage = await relay.pull({ cursor: firstPage.cursor, limit: 1 });
    expect(firstPage).toMatchObject({ changes: [first], hasMore: true });
    expect(secondPage).toMatchObject({ changes: [second], hasMore: false });
  });
});
