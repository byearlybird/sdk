import type { SyncChange } from "@byearlybird/sync";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { createStorage } from "unstorage";
import fsLiteDriver from "unstorage/drivers/fs-lite";
import { createApp } from "../src/app.js";

const domainA = "com.byearlybird.demo";
const domainB = "com.example.other";
const temporaryDirectories: string[] = [];

afterEach(async () => {
  const directories = temporaryDirectories.splice(0, temporaryDirectories.length);
  await Promise.all(directories.map(async (directory) => rm(directory, { recursive: true })));
});

// Merge and pagination rules are covered by @byearlybird/sync. These cover the relay's own
// job: the HTTP contract, persistence across a restart, and error mapping.
describe("demo sync relay", () => {
  it("persists pushed changes across a restart and pages through them by cursor", async () => {
    const directory = await createTemporaryDirectory();
    const app = await createApp(createSyncStorage(directory));
    const first = createChange("task-1", 1, "First");
    const second = createChange("task-2", 2, "Second");

    await expect(push(app, domainA, [first, second])).resolves.toMatchObject({ status: 204 });
    await expect(push(app, domainA, [first])).resolves.toMatchObject({ status: 204 });

    const reopened = await createApp(createSyncStorage(directory));
    const firstPage = await pull(reopened, domainA, null, 1);
    expect(firstPage).toEqual({ changes: [first], cursor: "1", hasMore: true });
    await expect(pull(reopened, domainA, firstPage.cursor, 1)).resolves.toEqual({
      changes: [second],
      cursor: "2",
      hasMore: false,
    });
  });

  it("serves each app domain the changes pushed to its own path", async () => {
    const app = await createApp(createSyncStorage(await createTemporaryDirectory()));
    const change = createChange("task-1", 1, "First");
    await push(app, domainA, [change]);

    await expect(pull(app, domainA, null, 10)).resolves.toMatchObject({ changes: [change] });
    await expect(pull(app, domainB, null, 10)).resolves.toMatchObject({ changes: [] });
  });

  it("answers requests without an app domain or a usable body with a client error", async () => {
    const app = await createApp(createSyncStorage(await createTemporaryDirectory()));

    await expect(app.request("/api/v1/apps//sync/pull")).resolves.toMatchObject({ status: 404 });
    await expect(
      app.request(`${syncPath(domainA)}/pull?cursor=not-a-cursor`),
    ).resolves.toMatchObject({ status: 400 });
    await expect(
      app.request(`${syncPath(domainA)}/push`, {
        body: JSON.stringify({ changes: "not-an-array" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      }),
    ).resolves.toMatchObject({ status: 400 });
  });
});

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "early-bird-demo-sync-"));
  temporaryDirectories.push(directory);
  return directory;
}

function createSyncStorage(directory: string) {
  return createStorage<object>({ driver: fsLiteDriver({ base: directory }) });
}

function syncPath(appDomain: string): string {
  return `/api/v1/apps/${encodeURIComponent(appDomain)}/sync`;
}

function createChange(id: string, counter: number, title: string): SyncChange {
  return {
    changeId: `change-${id}-${counter}`,
    collection: "todos",
    deleted: false,
    entity: { completed: false, createdAt: "2026-01-01", title },
    entityId: id,
    format: 1,
    version: { counter, replicaId: "test-replica" },
  };
}

async function push(
  app: Awaited<ReturnType<typeof createApp>>,
  appDomain: string,
  changes: readonly SyncChange[],
) {
  return app.request(`${syncPath(appDomain)}/push`, {
    body: JSON.stringify({ changes }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function pull(
  app: Awaited<ReturnType<typeof createApp>>,
  appDomain: string,
  cursor: string | null,
  limit: number,
): Promise<{ changes: SyncChange[]; cursor: string; hasMore: boolean }> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor !== null) query.set("cursor", cursor);
  const response = await app.request(`${syncPath(appDomain)}/pull?${query.toString()}`);
  return response.json();
}
