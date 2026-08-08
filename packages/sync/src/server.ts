import { assertNonemptyString } from "./assert.ts";
import type { SyncChange } from "./change.ts";
import { compareVersions } from "./clock.ts";
import type { Version } from "./clock.ts";
import type { SyncPullPage, SyncPullRequest } from "./transport.ts";

export type ServerSyncChange = Readonly<{
  /** Set on records that carry their own routing metadata, such as encrypted records. */
  appDomain?: string;
  changeId: string;
  collection: string;
  entityId: string;
  version: Version;
}>;

export type LatestSyncRecord<Change extends ServerSyncChange = SyncChange> = Readonly<{
  appDomain: string;
  change: Change;
  sequence: string;
}>;

export type LatestSyncState<Change extends ServerSyncChange = SyncChange> = Readonly<{
  format: 1;
  records: readonly LatestSyncRecord<Change>[];
  sequence: string;
}>;

export type ServerMergeStatus = "accepted" | "retry" | "stale";

export type ServerMergeResult<Change extends ServerSyncChange> = Readonly<{
  record: LatestSyncRecord<Change>;
  state: LatestSyncState<Change>;
  status: ServerMergeStatus;
}>;

export type LatestSyncPullRequest = SyncPullRequest & Readonly<{ appDomain: string }>;

export function createLatestSyncState<
  Change extends ServerSyncChange = SyncChange,
>(): LatestSyncState<Change> {
  return { format: 1, records: [], sequence: "0" };
}

/** Callers pass changes their own validator has already accepted. */
export function mergeServerChange<Change extends ServerSyncChange>(
  state: LatestSyncState<Change>,
  appDomain: string,
  incoming: Change,
): ServerMergeResult<Change> {
  const records = [...state.records];
  const merged = applyServerChange(records, state.sequence, appDomain, incoming);
  return {
    record: merged.record,
    state:
      merged.sequence === state.sequence
        ? state
        : { format: 1, records, sequence: merged.sequence },
    status: merged.status,
  };
}

/** Callers pass changes their own validator has already accepted. */
export function mergeServerChanges<Change extends ServerSyncChange>(
  state: LatestSyncState<Change>,
  appDomain: string,
  changes: readonly Change[],
): LatestSyncState<Change> {
  const records = [...state.records];
  let sequence = state.sequence;
  for (const change of changes) {
    sequence = applyServerChange(records, sequence, appDomain, change).sequence;
  }
  return sequence === state.sequence ? state : { format: 1, records, sequence };
}

export function pullLatestSyncRecords<Change extends ServerSyncChange>(
  state: LatestSyncState<Change>,
  request: LatestSyncPullRequest,
): SyncPullPage<Change> {
  assertNonemptyString(request.appDomain, "app domain");
  if (!Number.isSafeInteger(request.limit) || request.limit <= 0) {
    throw new RangeError("A synchronization pull limit must be a positive safe integer.");
  }
  const cursor = request.cursor === null ? 0n : parsePullCursor(request.cursor);
  if (cursor > parsePullCursor(state.sequence)) {
    throw new RangeError("A synchronization pull cursor is ahead of the server sequence.");
  }

  const matching: { change: Change; sequence: bigint }[] = [];
  for (const record of state.records) {
    if (record.appDomain !== request.appDomain) continue;
    const sequence = parsePullCursor(record.sequence);
    if (sequence > cursor) matching.push({ change: record.change, sequence });
  }
  matching.sort((left, right) => compareSequences(left.sequence, right.sequence));

  const page = matching.slice(0, request.limit);
  const last = page.at(-1);
  return {
    changes: page.map(({ change }) => change),
    cursor: last === undefined ? (request.cursor ?? "0") : createPullCursor(last.sequence),
    hasMore: page.length < matching.length,
  };
}

export function createPullCursor(sequence: bigint): string {
  if (sequence < 0n) throw new TypeError("A server sequence cannot be negative.");
  return sequence.toString();
}

export function parsePullCursor(cursor: unknown): bigint {
  if (typeof cursor !== "string" || !/^(0|[1-9][0-9]*)$/u.test(cursor)) {
    throw new TypeError("A synchronization pull cursor must be a canonical decimal string.");
  }
  return BigInt(cursor);
}

export function nextServerSequence(sequence: string): string {
  return createPullCursor(parsePullCursor(sequence) + 1n);
}

export function restoreLatestSyncState<Change extends ServerSyncChange>(
  value: unknown,
  validateChange: (change: unknown) => Change,
): LatestSyncState<Change> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Stored sync state must be an object.");
  }
  const candidate = value as Partial<LatestSyncState<Change>>;
  if (candidate.format !== 1 || !Array.isArray(candidate.records)) {
    throw new TypeError("Stored sync state has an unsupported format.");
  }
  const maximum = parsePullCursor(candidate.sequence);
  const coordinates = new Set<string>();
  const changeIds = new Set<string>();
  const sequences = new Set<bigint>();
  const records = candidate.records.map((recordValue) => {
    if (recordValue === null || typeof recordValue !== "object" || Array.isArray(recordValue)) {
      throw new TypeError("A stored sync record must be an object.");
    }
    const stored = recordValue as Partial<LatestSyncRecord<Change>>;
    assertNonemptyString(stored.appDomain, "app domain");
    const sequence = parsePullCursor(stored.sequence);
    if (sequence === 0n || sequence > maximum) {
      throw new TypeError("A stored sync record has an invalid server sequence.");
    }
    const change = validateChange(stored.change);
    assertMatchingAppDomain(change, stored.appDomain);
    const coordinate = JSON.stringify([stored.appDomain, change.collection, change.entityId]);
    const scopedChangeId = JSON.stringify([stored.appDomain, change.changeId]);
    if (coordinates.has(coordinate)) {
      throw new TypeError("Stored sync state contains a duplicate entity.");
    }
    if (changeIds.has(scopedChangeId)) {
      throw new TypeError("Stored sync state contains a duplicate change ID.");
    }
    if (sequences.has(sequence)) {
      throw new TypeError("Stored sync state contains a duplicate server sequence.");
    }
    coordinates.add(coordinate);
    changeIds.add(scopedChangeId);
    sequences.add(sequence);
    return { appDomain: stored.appDomain, change, sequence: createPullCursor(sequence) };
  });
  return { format: 1, records, sequence: createPullCursor(maximum) };
}

/** Appends or replaces the latest record for an entity, mutating `records` in place. */
function applyServerChange<Change extends ServerSyncChange>(
  records: LatestSyncRecord<Change>[],
  sequence: string,
  appDomain: string,
  incoming: Change,
): Readonly<{ record: LatestSyncRecord<Change>; sequence: string; status: ServerMergeStatus }> {
  assertNonemptyString(appDomain, "app domain");
  assertMatchingAppDomain(incoming, appDomain);

  let repeated: LatestSyncRecord<Change> | undefined;
  let index = -1;
  for (const [position, candidate] of records.entries()) {
    if (candidate.appDomain !== appDomain) continue;
    if (candidate.change.changeId === incoming.changeId) repeated = candidate;
    if (
      candidate.change.collection === incoming.collection &&
      candidate.change.entityId === incoming.entityId
    ) {
      index = position;
    }
  }

  if (repeated !== undefined) {
    if (
      repeated.change.collection !== incoming.collection ||
      repeated.change.entityId !== incoming.entityId ||
      compareVersions(incoming.version, repeated.change.version) !== 0
    ) {
      throw new TypeError("A sync change ID cannot be reused for another change.");
    }
    return { record: repeated, sequence, status: "retry" };
  }

  const stored = records[index];
  if (stored !== undefined) {
    const comparison = compareVersions(incoming.version, stored.change.version);
    if (comparison < 0) return { record: stored, sequence, status: "stale" };
    if (comparison === 0) {
      throw new TypeError(
        "A sync change cannot reuse an entity version with a different change ID.",
      );
    }
  }

  const nextSequence = nextServerSequence(sequence);
  const record = { appDomain, change: incoming, sequence: nextSequence };
  if (index === -1) records.push(record);
  else records[index] = record;
  return { record, sequence: nextSequence, status: "accepted" };
}

function assertMatchingAppDomain(change: ServerSyncChange, appDomain: string): void {
  if (change.appDomain !== undefined && change.appDomain !== appDomain) {
    throw new TypeError("A sync record does not match the requested app domain.");
  }
}

function compareSequences(left: bigint, right: bigint): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}
