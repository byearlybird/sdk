import type { SyncChange } from "./change.ts";

export type SyncPullRequest = Readonly<{
  cursor: string | null;
  limit: number;
}>;

export type SyncPullPage<Change = SyncChange> = Readonly<{
  changes: readonly Change[];
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
