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
