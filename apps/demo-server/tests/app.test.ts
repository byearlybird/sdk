import type { EncryptedSyncRecord } from "@byearlybird/sync/crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { createApp } from "../src/app.js";
import { createSqliteSyncStorage } from "../src/storage.js";
import type { SqliteSyncStorage } from "../src/storage.js";

const domainA = "com.byearlybird.demo";
const domainB = "com.example.other";
const temporaryDirectories: string[] = [];
const storages: SqliteSyncStorage[] = [];

afterEach(async () => {
  for (const storage of storages.splice(0, storages.length)) storage.close();
  const directories = temporaryDirectories.splice(0, temporaryDirectories.length);
  await Promise.all(directories.map(async (directory) => rm(directory, { recursive: true })));
});

// Merge and pagination rules are covered by @byearlybird/sync. These cover the relay's own
// job: the HTTP contract, persistence across a restart, and error mapping.
describe("demo sync relay", () => {
  it("persists pushed changes across a restart and pages through them by cursor", async () => {
    const directory = await createTemporaryDirectory();
    const storage = createSyncStorage(directory);
    const app = createApp(storage);
    const first = createChange("task-1", 1);
    const second = createChange("task-2", 2);

    await expect(push(app, domainA, [first, second])).resolves.toMatchObject({ status: 204 });
    await expect(push(app, domainA, [first])).resolves.toMatchObject({ status: 204 });

    storage.close();
    const reopened = createApp(createSyncStorage(directory));
    const firstPage = await pull(reopened, domainA, null, 1);
    expect(firstPage).toEqual({ changes: [first], cursor: "1", hasMore: true });
    await expect(pull(reopened, domainA, firstPage.cursor, 1)).resolves.toEqual({
      changes: [second],
      cursor: "2",
      hasMore: false,
    });
  });

  it("serves each app domain the changes pushed to its own path", async () => {
    const app = createApp(createSyncStorage(await createTemporaryDirectory()));
    const change = createChange("task-1", 1);
    await push(app, domainA, [change]);

    await expect(pull(app, domainA, null, 10)).resolves.toMatchObject({ changes: [change] });
    await expect(pull(app, domainB, null, 10)).resolves.toMatchObject({ changes: [] });
  });

  it("answers requests without an app domain or a usable body with a client error", async () => {
    const app = createApp(createSyncStorage(await createTemporaryDirectory()));

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
    await expect(
      app.request(`${syncPath(domainA)}/push`, {
        body: JSON.stringify({
          changes: [
            {
              changeId: "plaintext-change",
              collection: "todos",
              deleted: false,
              entity: { title: "The server must not accept this" },
              entityId: "task-1",
              format: 1,
              version: { counter: 1, replicaId: "test-replica" },
            },
          ],
        }),
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
  const storage = createSqliteSyncStorage(join(directory, "sync.sqlite"));
  storages.push(storage);
  return storage;
}

function syncPath(appDomain: string): string {
  return `/api/v1/apps/${encodeURIComponent(appDomain)}/sync`;
}

function createChange(id: string, counter: number): EncryptedSyncRecord {
  return {
    appDomain: domainA,
    changeId: `change-${id}-${counter}`,
    collection: "todos",
    entityId: id,
    format: 1,
    keyId: "demo-key",
    payload: "1.example-nonce.example-ciphertext",
    version: { counter, replicaId: "test-replica" },
  };
}

async function push(
  app: ReturnType<typeof createApp>,
  appDomain: string,
  changes: readonly EncryptedSyncRecord[],
) {
  return app.request(`${syncPath(appDomain)}/push`, {
    body: JSON.stringify({ changes }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function pull(
  app: ReturnType<typeof createApp>,
  appDomain: string,
  cursor: string | null,
  limit: number,
): Promise<{ changes: EncryptedSyncRecord[]; cursor: string; hasMore: boolean }> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (cursor !== null) query.set("cursor", cursor);
  const response = await app.request(`${syncPath(appDomain)}/pull?${query.toString()}`);
  return response.json();
}
