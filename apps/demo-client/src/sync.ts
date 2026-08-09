import { createSynchronizer } from "@byearlybird/db";
import type { SyncPullPage, SyncTransport } from "@byearlybird/sync";
import { decryptSyncRecord, encryptSyncChange } from "@byearlybird/sync/crypto";
import type { EncryptedSyncRecord } from "@byearlybird/sync/crypto";
import { database } from "./database";
import { demoEncryption } from "./encryption";

const relayUrl = "http://localhost:3001";
const appDomain = "com.byearlybird.demo";
const syncPath = `/api/v1/apps/${encodeURIComponent(appDomain)}/sync`;

const transport: SyncTransport = {
  pull: async ({ cursor, limit }) => {
    const url = new URL(`${syncPath}/pull`, relayUrl);
    url.searchParams.set("limit", String(limit));
    if (cursor !== null) url.searchParams.set("cursor", cursor);
    const response = await request(url);
    const page = (await response.json()) as SyncPullPage<EncryptedSyncRecord>;
    const key = await demoEncryption.key;
    const changes = await Promise.all(
      page.changes.map(async (record) => {
        if (record.keyId !== demoEncryption.keyId) {
          throw new Error(
            "This browser has a different demo setup key. Import the key shown by the other browser.",
          );
        }
        return decryptSyncRecord(record, { key });
      }),
    );
    return { changes, cursor: page.cursor, hasMore: page.hasMore };
  },
  push: async ({ changes }) => {
    const key = await demoEncryption.key;
    const encryptedChanges = await Promise.all(
      changes.map((change) =>
        encryptSyncChange(change, {
          appDomain,
          key,
          keyId: demoEncryption.keyId,
        }),
      ),
    );
    await request(new URL(`${syncPath}/push`, relayUrl), {
      body: JSON.stringify({ changes: encryptedChanges }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
  },
};

const synchronizer = createSynchronizer(database, { transport });

export function startDemoSync(): void {
  function report(operation: Promise<void>): void {
    void operation.catch((error: unknown) => {
      console.warn("Demo synchronization is unavailable.", error);
    });
  }

  database.onChange(() => report(synchronizer.sync()));
  window.setInterval(() => report(synchronizer.sync()), 5_000);
  report(synchronizer.sync());
}

async function request(url: URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (response.ok) return response;

  throw new Error(`The demo sync relay returned ${response.status}.`);
}
