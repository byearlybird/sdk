import { afterEach, describe, expect, expectTypeOf, it } from "vite-plus/test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase } from "../src/database.ts";
import type { Database } from "../src/database.ts";
import { createSynchronizer } from "../src/synchronizer.ts";
import type {
  SyncPullPage,
  SyncPullRequest,
  SyncPushRequest,
  SyncTransport,
  Synchronizer,
} from "../src/synchronizer.ts";
import type { SyncChange } from "../src/sync.ts";
import type { StorageAdapter } from "../src/storage.ts";
import { createNodeStorageAdapter } from "./node-storage.ts";

type TestSchema = {
  tasks: {
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
  const database = createDatabase<TestSchema>({ name: crypto.randomUUID(), storage });
  databases.push(database);
  return database;
}

function createRemoteChange(id: string, counter: number): SyncChange {
  return {
    changeId: `remote-${id}`,
    collection: "tasks",
    deleted: false,
    entity: { title: `Remote ${id}` },
    entityId: id,
    format: 1,
    version: { counter, replicaId: "remote" },
  };
}

function emptyPage(cursor: string): SyncPullPage {
  return { changes: [], cursor, hasMore: false };
}

describe("createSynchronizer", () => {
  it("pulls every remote page before draining the local outbox", async () => {
    const database = createReplica();
    await database.insert("tasks", "local", { title: "Local" });
    const pullRequests: SyncPullRequest[] = [];
    const pushRequests: SyncPushRequest[] = [];
    const operations: string[] = [];
    const transport: SyncTransport = {
      pull: async (request) => {
        pullRequests.push(request);
        operations.push("pull");
        return request.cursor === null
          ? { changes: [createRemoteChange("first", 2)], cursor: "cursor-1", hasMore: true }
          : { changes: [createRemoteChange("second", 3)], cursor: "cursor-2", hasMore: false };
      },
      push: async (request) => {
        pushRequests.push(request);
        operations.push("push");
      },
    };
    const synchronizer = createSynchronizer(database, {
      pullLimit: 2,
      pushLimit: 3,
      transport,
    });

    expectTypeOf(synchronizer).toEqualTypeOf<Synchronizer>();
    await synchronizer.sync();

    expect(pullRequests).toEqual([
      { cursor: null, limit: 2 },
      { cursor: "cursor-1", limit: 2 },
    ]);
    expect(operations).toEqual(["pull", "pull", "push"]);
    expect(pushRequests).toHaveLength(1);
    expect(pushRequests[0]?.changes).toMatchObject([{ entityId: "local" }]);
    await expect(database.get("tasks", "first")).resolves.toEqual({ title: "Remote first" });
    await expect(database.get("tasks", "second")).resolves.toEqual({ title: "Remote second" });
    await expect(database.getSyncCheckpoint()).resolves.toBe("cursor-2");
    await expect(database.getPendingChanges(100)).resolves.toEqual([]);
  });

  it("persists an empty pull checkpoint across database restarts", async () => {
    const directory = await mkdtemp(join(tmpdir(), "byearlybird-synchronizer-"));
    temporaryDirectories.push(directory);
    const storage = createNodeStorageAdapter(join(directory, "database.sqlite"));
    const first = createReplica(storage);
    await createSynchronizer(first, {
      transport: {
        pull: async () => emptyPage("cursor-1"),
        push: async () => undefined,
      },
    }).sync();
    await first.close();

    const observedCursors: (string | null)[] = [];
    const reopened = createReplica(storage);
    await createSynchronizer(reopened, {
      transport: {
        pull: async ({ cursor }) => {
          observedCursors.push(cursor);
          return emptyPage("cursor-2");
        },
        push: async () => undefined,
      },
    }).sync();

    expect(observedCursors).toEqual(["cursor-1"]);
    await expect(reopened.getSyncCheckpoint()).resolves.toBe("cursor-2");
  });

  it("commits a checkpoint only when its remote page is valid", async () => {
    const database = createReplica();
    const synchronizer = createSynchronizer(database, {
      transport: {
        pull: async () => ({
          changes: [{ ...createRemoteChange("invalid", 1), entity: undefined }],
          cursor: "invalid-cursor",
          hasMore: false,
        }),
        push: async () => undefined,
      },
    });

    await expect(synchronizer.sync()).rejects.toThrow("JSON-serializable");
    await expect(database.get("tasks", "invalid")).resolves.toBeNull();
    await expect(database.getSyncCheckpoint()).resolves.toBeNull();
  });

  it("resumes from the last committed page after a later pull fails", async () => {
    const database = createReplica();
    const pullRequests: SyncPullRequest[] = [];
    const failure = new Error("Pull failed.");
    const synchronizer = createSynchronizer(database, {
      transport: {
        pull: async (request) => {
          pullRequests.push(request);
          if (request.cursor === null) {
            return {
              changes: [createRemoteChange("first", 1)],
              cursor: "cursor-1",
              hasMore: true,
            };
          }
          throw failure;
        },
        push: async () => undefined,
      },
    });

    await expect(synchronizer.sync()).rejects.toBe(failure);
    await expect(database.get("tasks", "first")).resolves.toEqual({ title: "Remote first" });
    await expect(database.getSyncCheckpoint()).resolves.toBe("cursor-1");
    await expect(synchronizer.sync()).rejects.toBe(failure);
    expect(pullRequests.at(-1)).toEqual({ cursor: "cursor-1", limit: 100 });
  });

  it("retries a push safely when the first response is lost", async () => {
    const database = createReplica();
    await database.insert("tasks", "local", { title: "Local" });
    const acceptedChangeIds = new Set<string>();
    let pushCount = 0;
    const synchronizer = createSynchronizer(database, {
      transport: {
        pull: async () => emptyPage("cursor-0"),
        push: async ({ changes }) => {
          pushCount += 1;
          for (const change of changes) acceptedChangeIds.add(change.changeId);
          if (pushCount === 1) throw new Error("Response lost.");
        },
      },
    });

    await expect(synchronizer.sync()).rejects.toThrow("Response lost");
    await expect(database.getPendingChanges(100)).resolves.toHaveLength(1);
    await expect(synchronizer.sync()).resolves.toBeUndefined();

    expect(pushCount).toBe(2);
    expect(acceptedChangeIds).toHaveLength(1);
    await expect(database.getPendingChanges(100)).resolves.toEqual([]);
  });

  it("drains the local outbox using the configured push limit", async () => {
    const database = createReplica();
    await database.insert("tasks", "first", { title: "First" });
    await database.insert("tasks", "second", { title: "Second" });
    await database.insert("tasks", "third", { title: "Third" });
    const pushedBatchSizes: number[] = [];
    const synchronizer = createSynchronizer(database, {
      pushLimit: 2,
      transport: {
        pull: async () => emptyPage("cursor-0"),
        push: async ({ changes }) => {
          pushedBatchSizes.push(changes.length);
        },
      },
    });

    await synchronizer.sync();

    expect(pushedBatchSizes).toEqual([2, 1]);
    await expect(database.getPendingChanges(100)).resolves.toEqual([]);
  });

  it("does not clear a newer local mutation with an older in-flight push", async () => {
    const database = createReplica();
    await database.insert("tasks", "local", { title: "First" });
    const pushStarted = createDeferred();
    const releasePush = createDeferred();
    const pushedChangeIds: string[] = [];
    let pushCount = 0;
    const synchronizer = createSynchronizer(database, {
      transport: {
        pull: async () => emptyPage("cursor-0"),
        push: async ({ changes }) => {
          pushCount += 1;
          pushedChangeIds.push(...changes.map(({ changeId }) => changeId));
          if (pushCount === 1) {
            pushStarted.resolve();
            await releasePush.promise;
          }
        },
      },
    });

    const sync = synchronizer.sync();
    await pushStarted.promise;
    await database.patch("tasks", "local", { title: "Second" });
    releasePush.resolve();
    await sync;

    expect(pushedChangeIds).toHaveLength(2);
    expect(new Set(pushedChangeIds)).toHaveLength(2);
    await expect(database.getPendingChanges(100)).resolves.toEqual([]);
  });

  it("shares one run between concurrent sync calls", async () => {
    const database = createReplica();
    const pullStarted = createDeferred();
    const releasePull = createDeferred();
    let pullCount = 0;
    const synchronizer = createSynchronizer(database, {
      transport: {
        pull: async () => {
          pullCount += 1;
          pullStarted.resolve();
          await releasePull.promise;
          return emptyPage("cursor-0");
        },
        push: async () => undefined,
      },
    });

    const first = synchronizer.sync();
    const second = synchronizer.sync();
    await pullStarted.promise;

    expect(second).toBe(first);
    expect(pullCount).toBe(1);
    releasePull.resolve();
    await Promise.all([first, second]);
  });

  it("rejects invalid limits and non-advancing paginated cursors", async () => {
    const database = createReplica();
    const transport: SyncTransport = {
      pull: async () => ({ changes: [], cursor: "same", hasMore: true }),
      push: async () => undefined,
    };

    expect(() => createSynchronizer(database, { pullLimit: 0, transport })).toThrow("pull limit");
    expect(() => createSynchronizer(database, { pushLimit: Number.NaN, transport })).toThrow(
      "push limit",
    );
    await database.applyRemoteChanges([], { checkpoint: "same" });
    await expect(createSynchronizer(database, { transport }).sync()).rejects.toThrow(
      "must advance its cursor",
    );
  });
});

function createDeferred(): Readonly<{
  promise: Promise<void>;
  resolve(): void;
}> {
  let resolvePromise: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return {
    promise,
    resolve: () => {
      if (resolvePromise === undefined) throw new Error("Deferred promise was not initialized.");
      resolvePromise();
    },
  };
}
