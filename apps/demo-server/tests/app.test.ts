import type { SyncChange } from "@byearlybird/db";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { createStorage } from "unstorage";
import fsLiteDriver from "unstorage/drivers/fs-lite";
import { createApp } from "../src/app.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("demo sync relay", () => {
  it("persists deduplicated changes and returns cursor-based pages", async () => {
    const directory = await mkdtemp(join(tmpdir(), "early-bird-demo-sync-"));
    temporaryDirectories.push(directory);
    const firstApp = await createApp(createSyncStorage(directory));
    const first = createChange("first", 1);
    const second = createChange("second", 2);

    await expect(push(firstApp, [first, second, first])).resolves.toMatchObject({ status: 204 });
    await expect(push(firstApp, [first])).resolves.toMatchObject({ status: 204 });

    const reopenedApp = await createApp(createSyncStorage(directory));
    const firstPage = await pull(reopenedApp, null, 1);
    expect(firstPage).toEqual({ changes: [first], cursor: "1", hasMore: true });
    await expect(pull(reopenedApp, firstPage.cursor, 1)).resolves.toEqual({
      changes: [second],
      cursor: "2",
      hasMore: false,
    });
  });
});

function createSyncStorage(directory: string) {
  return createStorage<SyncChange[]>({ driver: fsLiteDriver({ base: directory }) });
}

function createChange(id: string, counter: number): SyncChange {
  return {
    changeId: `change-${id}`,
    collection: "todos",
    deleted: false,
    entity: { completed: false, createdAt: "2026-01-01", title: id },
    entityId: id,
    format: 1,
    version: { counter, replicaId: "test-replica" },
  };
}

async function push(app: Awaited<ReturnType<typeof createApp>>, changes: readonly SyncChange[]) {
  return app.request("/sync/push", {
    body: JSON.stringify({ changes }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function pull(
  app: Awaited<ReturnType<typeof createApp>>,
  cursor: string | null,
  limit: number,
) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor !== null) query.set("cursor", cursor);
  const response = await app.request(`/sync/pull?${query.toString()}`);
  return response.json();
}
