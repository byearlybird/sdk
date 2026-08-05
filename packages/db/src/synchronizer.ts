import type { Database } from "./database.ts";
import type { SyncChange } from "./sync.ts";

const defaultBatchLimit = 100;

export type SyncPullRequest = Readonly<{
  cursor: string | null;
  limit: number;
}>;

export type SyncPullPage = Readonly<{
  changes: readonly SyncChange[];
  cursor: string;
  hasMore: boolean;
}>;

export type SyncPushRequest = Readonly<{
  changes: readonly SyncChange[];
}>;

export type SyncTransport = Readonly<{
  /** Returns the next durable page after an opaque cursor. */
  pull(request: SyncPullRequest): Promise<SyncPullPage>;
  /** Resolves only after every change is durably accepted. Retries must be idempotent by change ID. */
  push(request: SyncPushRequest): Promise<void>;
}>;

export type Synchronizer = Readonly<{
  /** Pulls all available remote pages, then drains the local outbox. */
  sync(): Promise<void>;
}>;

export type SynchronizerOptions = Readonly<{
  pullLimit?: number;
  pushLimit?: number;
  transport: SyncTransport;
}>;

export function createSynchronizer<Schema>(
  database: Database<Schema>,
  options: SynchronizerOptions,
): Synchronizer {
  const { transport } = options;
  const pullLimit = normalizeBatchLimit(options.pullLimit ?? defaultBatchLimit, "pull");
  const pushLimit = normalizeBatchLimit(options.pushLimit ?? defaultBatchLimit, "push");
  let activeSync: Promise<void> | undefined;

  function sync(): Promise<void> {
    activeSync ??= performSync(database, transport, pullLimit, pushLimit).finally(() => {
      activeSync = undefined;
    });
    return activeSync;
  }

  return Object.freeze({ sync });
}

async function performSync<Schema>(
  database: Database<Schema>,
  transport: SyncTransport,
  pullLimit: number,
  pushLimit: number,
): Promise<void> {
  await pullRemoteChanges(database, transport, pullLimit);
  await pushLocalChanges(database, transport, pushLimit);
}

async function pullRemoteChanges<Schema>(
  database: Database<Schema>,
  transport: SyncTransport,
  limit: number,
): Promise<void> {
  let cursor = await database.getSyncCheckpoint();
  const visitedCursors = new Set<string | null>([cursor]);

  while (true) {
    const page = normalizePullPage(await transport.pull({ cursor, limit }));
    if ((page.hasMore || page.changes.length > 0) && visitedCursors.has(page.cursor)) {
      throw new TypeError(
        "A synchronization pull page containing changes or more results must advance its cursor.",
      );
    }
    await database.applyRemoteChanges(page.changes, { checkpoint: page.cursor });
    cursor = page.cursor;
    if (!page.hasMore) return;
    visitedCursors.add(cursor);
  }
}

async function pushLocalChanges<Schema>(
  database: Database<Schema>,
  transport: SyncTransport,
  limit: number,
): Promise<void> {
  while (true) {
    const changes = await database.getPendingChanges(limit);
    if (changes.length === 0) return;
    const changeIds = changes.map(({ changeId }) => changeId);
    await transport.push({ changes });
    await database.acknowledgeChanges(changeIds);
  }
}

/** Validates a page returned by a caller-supplied transport. */
function normalizePullPage(page: SyncPullPage): SyncPullPage {
  if (page === null || typeof page !== "object" || Array.isArray(page)) {
    throw new TypeError("A synchronization pull result must be an object.");
  }
  if (!Array.isArray(page.changes)) {
    throw new TypeError("A synchronization pull result must contain a changes array.");
  }
  if (typeof page.cursor !== "string" || page.cursor.length === 0) {
    throw new TypeError("A synchronization pull cursor must be a nonempty string.");
  }
  if (typeof page.hasMore !== "boolean") {
    throw new TypeError("A synchronization pull result hasMore value must be boolean.");
  }
  return page;
}

function normalizeBatchLimit(limit: number, direction: "pull" | "push"): number {
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new RangeError(`A synchronization ${direction} limit must be a positive safe integer.`);
  }
  return limit;
}
