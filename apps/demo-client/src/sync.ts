import { createSynchronizer } from "@byearlybird/db";
import type { SyncPullPage, SyncTransport } from "@byearlybird/db";
import { database } from "./database";

const relayUrl = "http://localhost:3001";

const transport: SyncTransport = {
  pull: async ({ cursor, limit }) => {
    const url = new URL("/sync/pull", relayUrl);
    url.searchParams.set("limit", String(limit));
    if (cursor !== null) url.searchParams.set("cursor", cursor);
    const response = await request(url);
    return response.json() as Promise<SyncPullPage>;
  },
  push: async ({ changes }) => {
    await request(new URL("/sync/push", relayUrl), {
      body: JSON.stringify({ changes }),
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

  async function pushPendingChanges(): Promise<void> {
    const changes = await database.getPendingChanges(100);
    if (changes.length === 0) return;
    await transport.push({ changes });
    await database.acknowledgeChanges(changes.map(({ changeId }) => changeId));
  }

  database.onChange(() => report(pushPendingChanges()));
  window.setInterval(() => report(synchronizer.sync()), 5_000);
  report(synchronizer.sync());
}

async function request(url: URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (response.ok) return response;

  throw new Error(`The demo sync relay returned ${response.status}.`);
}
