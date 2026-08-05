import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compareVersions } from "../src/clock.ts";
import { createDatabase } from "../src/database.ts";
import type { Database, DatabaseChange } from "../src/database.ts";
import {
  normalizeAcknowledgments,
  normalizePendingLimit,
  normalizeSyncChanges,
} from "../src/sync.ts";
import type { SyncChange } from "../src/sync.ts";
import type { StorageAdapter } from "../src/storage.ts";
import { createNodeStorageAdapter } from "./node-storage.ts";

type TestSchema = {
  tasks: {
    completed?: boolean;
    title: string;
  };
};

const databases: Database<TestSchema>[] = [];
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(databases.splice(0).map((database) => database.close()));
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

function createReplica(storage: StorageAdapter = createNodeStorageAdapter()): Database<TestSchema> {
  const database = createDatabase<TestSchema>({
    name: crypto.randomUUID(),
    storage,
  });
  databases.push(database);
  return database;
}

async function transfer(
  source: Database<TestSchema>,
  destination: Database<TestSchema>,
): Promise<SyncChange[]> {
  const changes = await source.getPendingChanges(100);
  await destination.applyRemoteChanges(changes);
  await source.acknowledgeChanges(changes.map(({ changeId }) => changeId));
  return changes;
}

describe("database synchronization primitives", () => {
  it("coalesces local mutations into a stable full-entity outbox change", async () => {
    const database = createReplica();
    await database.insert("tasks", "task-1", { title: "First" });
    const [inserted] = await database.getPendingChanges(100);
    await database.patch("tasks", "task-1", { completed: true, title: "Updated" });
    const [updated] = await database.getPendingChanges(100);
    const [repeated] = await database.getPendingChanges(100);

    expect(inserted).toMatchObject({
      collection: "tasks",
      deleted: false,
      entity: { title: "First" },
      entityId: "task-1",
      version: { counter: 1 },
    });
    expect(updated).toMatchObject({
      collection: "tasks",
      deleted: false,
      entity: { completed: true, title: "Updated" },
      entityId: "task-1",
      version: { counter: 2 },
    });
    expect(updated?.changeId).not.toBe(inserted?.changeId);
    expect(repeated).toEqual(updated);

    await database.acknowledgeChanges([inserted?.changeId ?? "missing"]);
    await expect(database.getPendingChanges(100)).resolves.toEqual([updated]);
    await database.acknowledgeChanges([updated?.changeId ?? "missing"]);
    await expect(database.getPendingChanges(100)).resolves.toEqual([]);
  });

  it("propagates live entities, tombstones, and intentional recreation", async () => {
    const first = createReplica();
    const second = createReplica();

    await first.insert("tasks", "task-1", { title: "First" });
    await transfer(first, second);
    await expect(second.get("tasks", "task-1")).resolves.toEqual({ title: "First" });

    await first.delete("tasks", "task-1");
    const [deletion] = await transfer(first, second);
    expect(deletion).toMatchObject({ deleted: true, entityId: "task-1" });
    await expect(second.get("tasks", "task-1")).resolves.toBeNull();

    await second.insert("tasks", "task-1", { title: "Recreated" });
    await transfer(second, first);
    await expect(first.get("tasks", "task-1")).resolves.toEqual({ title: "Recreated" });
  });

  it("applies remote pages atomically and publishes only visible committed changes", async () => {
    const source = createReplica();
    const destination = createReplica();
    const listener = vi.fn<(change: DatabaseChange<TestSchema>) => void>();
    destination.onChange(listener);
    await source.insert("tasks", "task-1", { title: "First" });
    const changes = await source.getPendingChanges(100);

    await expect(destination.applyRemoteChanges(changes)).resolves.toBeUndefined();
    await expect(destination.applyRemoteChanges(changes)).resolves.toBeUndefined();
    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({
      collection: "tasks",
      id: "task-1",
      operation: "insert",
    });
    await expect(destination.getPendingChanges(100)).resolves.toEqual([]);
  });

  it("converges concurrent full-entity edits by Lamport version", async () => {
    const first = createReplica();
    const second = createReplica();
    await first.insert("tasks", "task-1", { title: "Initial" });
    await transfer(first, second);

    await first.patch("tasks", "task-1", { title: "First replica" });
    await second.patch("tasks", "task-1", { completed: true, title: "Second replica" });
    const [firstChange] = await first.getPendingChanges(100);
    const [secondChange] = await second.getPendingChanges(100);
    if (firstChange === undefined || secondChange === undefined)
      throw new Error("Missing changes.");
    const winner =
      compareVersions(firstChange.version, secondChange.version) > 0 ? firstChange : secondChange;

    await first.applyRemoteChanges([secondChange]);
    await second.applyRemoteChanges([firstChange]);

    const expected = winner.deleted ? null : winner.entity;
    await expect(first.get("tasks", "task-1")).resolves.toEqual(expected);
    await expect(second.get("tasks", "task-1")).resolves.toEqual(expected);
  });

  it("converges edit/delete conflicts regardless of delivery order", async () => {
    const first = createReplica();
    const second = createReplica();
    await first.insert("tasks", "task-1", { title: "Initial" });
    await transfer(first, second);

    await first.patch("tasks", "task-1", { title: "Edited" });
    await second.delete("tasks", "task-1");
    const [edit] = await first.getPendingChanges(100);
    const [deletion] = await second.getPendingChanges(100);
    if (edit === undefined || deletion === undefined) throw new Error("Missing changes.");
    if (edit.deleted || !deletion.deleted) throw new Error("Unexpected change states.");

    await first.applyRemoteChanges([deletion]);
    await second.applyRemoteChanges([edit]);
    await first.applyRemoteChanges([edit, deletion]);
    await second.applyRemoteChanges([deletion, edit]);

    const expected = compareVersions(edit.version, deletion.version) > 0 ? edit.entity : null;
    await expect(first.get("tasks", "task-1")).resolves.toEqual(expected);
    await expect(second.get("tasks", "task-1")).resolves.toEqual(expected);
  });

  it("handles reversed and repeated versions of one entity", async () => {
    const source = createReplica();
    const destination = createReplica();
    await source.insert("tasks", "task-1", { title: "First" });
    const [first] = await source.getPendingChanges(100);
    await source.patch("tasks", "task-1", { title: "Second" });
    const [second] = await source.getPendingChanges(100);
    if (first === undefined || second === undefined) throw new Error("Missing changes.");

    await destination.applyRemoteChanges([second, first]);
    await destination.applyRemoteChanges([first, second]);
    await expect(destination.get("tasks", "task-1")).resolves.toEqual({ title: "Second" });
  });

  it("observes remote clocks even for invisible tombstones", async () => {
    const database = createReplica();
    await database.applyRemoteChanges([
      {
        changeId: "remote-tombstone",
        collection: "tasks",
        deleted: true,
        entityId: "missing",
        format: 1,
        version: { counter: 50, replicaId: "remote" },
      },
    ]);
    await database.insert("tasks", "task-1", { title: "After observation" });
    const [change] = await database.getPendingChanges(100);
    expect(change?.version.counter).toBe(51);
  });

  it("rejects a terminal remote clock without poisoning local writes", async () => {
    const database = createReplica();

    await expect(
      database.applyRemoteChanges([
        {
          changeId: "terminal-clock",
          collection: "tasks",
          deleted: false,
          entity: { title: "Remote" },
          entityId: "remote",
          format: 1,
          version: { counter: Number.MAX_SAFE_INTEGER, replicaId: "remote" },
        },
      ]),
    ).rejects.toThrow("cannot be advanced");
    await expect(database.get("tasks", "remote")).resolves.toBeNull();

    await database.insert("tasks", "local", { title: "Local" });
    const [change] = await database.getPendingChanges(100);
    expect(change?.version.counter).toBe(1);
  });

  it("persists its replica clock and pending outbox across a restart", async () => {
    const directory = await mkdtemp(join(tmpdir(), "byearlybird-db-sync-"));
    temporaryDirectories.push(directory);
    const storage = createNodeStorageAdapter(join(directory, "database.sqlite"));
    const first = createReplica(storage);
    await first.insert("tasks", "task-1", { title: "Before restart" });
    const [beforeRestart] = await first.getPendingChanges(100);
    await first.close();

    const reopened = createReplica(storage);
    await expect(reopened.getPendingChanges(100)).resolves.toEqual([beforeRestart]);
    await reopened.patch("tasks", "task-1", { title: "After restart" });
    const [afterRestart] = await reopened.getPendingChanges(100);
    expect(afterRestart?.version).toEqual({
      counter: 2,
      replicaId: beforeRestart?.version.replicaId,
    });
  });

  it("rejects an invalid page without applying its valid changes", async () => {
    const database = createReplica();
    const invalid = [
      {
        changeId: "valid",
        collection: "tasks",
        deleted: false,
        entity: { title: "Valid" },
        entityId: "valid",
        format: 1,
        version: { counter: 1, replicaId: "remote" },
      },
      {
        changeId: "invalid",
        collection: "tasks",
        deleted: false,
        entity: { title: undefined },
        entityId: "invalid",
        format: 1,
        version: { counter: 2, replicaId: "remote" },
      },
    ] as unknown as SyncChange[];

    await expect(database.applyRemoteChanges(invalid)).rejects.toThrow("JSON-serializable");
    await expect(database.getAll("tasks")).resolves.toEqual([]);
  });

  it("clears an outbox entry only for an equal or greater remote version", async () => {
    const database = createReplica();
    await database.insert("tasks", "task-1", { title: "Local" });
    const [local] = await database.getPendingChanges(100);
    if (local === undefined || local.deleted) throw new Error("Missing local change.");

    await database.applyRemoteChanges([
      {
        ...local,
        changeId: "older",
        version: { counter: 0, replicaId: "remote" },
      },
    ]);
    await expect(database.getPendingChanges(100)).resolves.toEqual([local]);

    await database.applyRemoteChanges([{ ...local, changeId: "echo" }]);
    await expect(database.getPendingChanges(100)).resolves.toEqual([]);
  });

  it("rejects reuse of one version for different entity state", async () => {
    const database = createReplica();
    await database.insert("tasks", "task-1", { title: "Local" });
    const [local] = await database.getPendingChanges(100);
    if (local === undefined || local.deleted) throw new Error("Missing local change.");

    await expect(
      database.applyRemoteChanges([
        { ...local, changeId: "conflict", entity: { title: "Different" } },
      ]),
    ).rejects.toThrow("reuse a version");
    await expect(database.get("tasks", "task-1")).resolves.toEqual({ title: "Local" });
    await expect(database.getPendingChanges(100)).resolves.toEqual([local]);
  });

  it("converges three replicas through manual pairwise exchange", async () => {
    const first = createReplica();
    const second = createReplica();
    const third = createReplica();
    await first.insert("tasks", "first", { title: "First" });
    await second.insert("tasks", "second", { title: "Second" });
    await third.insert("tasks", "third", { title: "Third" });

    const changes = [
      ...(await first.getPendingChanges(100)),
      ...(await second.getPendingChanges(100)),
      ...(await third.getPendingChanges(100)),
    ];
    for (const database of [first, second, third]) {
      await database.applyRemoteChanges(changes);
    }

    const expected = [
      { data: { title: "First" }, id: "first" },
      { data: { title: "Second" }, id: "second" },
      { data: { title: "Third" }, id: "third" },
    ];
    await expect(first.getAll("tasks")).resolves.toEqual(expected);
    await expect(second.getAll("tasks")).resolves.toEqual(expected);
    await expect(third.getAll("tasks")).resolves.toEqual(expected);
  });

  it("allows the caller to choose synchronization batch sizes", () => {
    const changes = Array.from({ length: 1_001 }, (_, index) => ({
      changeId: `change-${index}`,
      collection: "tasks",
      deleted: true as const,
      entityId: `task-${index}`,
      format: 1 as const,
      version: { counter: index, replicaId: "remote" },
    }));
    const acknowledgments = changes.map(({ changeId }) => changeId);

    expect(normalizeSyncChanges(changes)).toHaveLength(changes.length);
    expect(normalizeAcknowledgments(acknowledgments)).toHaveLength(acknowledgments.length);
    expect(normalizePendingLimit(changes.length)).toBe(changes.length);
  });
});
