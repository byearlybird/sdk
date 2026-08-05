import type { Database } from "./database.ts";
import type { SyncChange } from "./sync.ts";
import { createSynchronizer } from "./synchronizer.ts";
import type { SyncTransport, Synchronizer } from "./synchronizer.ts";

export function createInMemorySyncRelay(): SyncTransport {
  const changes: SyncChange[] = [];
  const changeIds = new Set<string>();

  return {
    pull: async ({ cursor, limit }) => {
      const start = Number(cursor ?? 0);
      const end = Math.min(start + limit, changes.length);
      return {
        changes: changes.slice(start, end),
        cursor: String(end),
        hasMore: end < changes.length,
      };
    },
    push: async ({ changes: incoming }) => {
      for (const change of incoming) {
        if (changeIds.has(change.changeId)) continue;
        changeIds.add(change.changeId);
        changes.push(change);
      }
    },
  };
}

export function createInMemorySynchronizer<Schema>(
  database: Database<Schema>,
  relay: SyncTransport,
): Synchronizer {
  return createSynchronizer(database, { transport: relay });
}
