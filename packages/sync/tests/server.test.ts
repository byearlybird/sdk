import { describe, expect, it } from "vite-plus/test";
import { validateSyncChange } from "../src/change.ts";
import type { SyncChange } from "../src/change.ts";
import type { EncryptedSyncRecord } from "../src/crypto.ts";
import {
  createLatestSyncState,
  createPullCursor,
  mergeServerChange,
  mergeServerChanges,
  nextServerSequence,
  parsePullCursor,
  pullLatestSyncRecords,
  restoreLatestSyncState,
} from "../src/server.ts";

describe("latest-state server helpers", () => {
  it("keeps only the greatest version for each entity", () => {
    const first = createChange("task-1", 1, "First");
    const second = createChange("task-1", 2, "Second");
    let state = mergeServerChange(createLatestSyncState(), domainA, first).state;
    state = mergeServerChange(state, domainA, second).state;
    const stale = mergeServerChange(state, domainA, first);

    expect(state.records).toHaveLength(1);
    expect(state.records[0]?.change).toEqual(second);
    expect(state.sequence).toBe("2");
    expect(stale.status).toBe("stale");
    expect(stale.state).toBe(state);
  });

  it("treats a repeated change as a retry without assigning a sequence", () => {
    const change = createChange("task-1", 1, "First");
    const accepted = mergeServerChange(createLatestSyncState(), domainA, change);
    const retry = mergeServerChange(accepted.state, domainA, change);

    expect(retry.status).toBe("retry");
    expect(retry.state).toBe(accepted.state);
    expect(retry.record.sequence).toBe("1");
  });

  it("rejects reuse of a change ID or entity version", () => {
    const first = createChange("task-1", 1, "First");
    const state = mergeServerChange(createLatestSyncState(), domainA, first).state;

    expect(() =>
      mergeServerChange(state, domainA, {
        ...createChange("task-2", 2, "Second"),
        changeId: first.changeId,
      }),
    ).toThrow("change ID");
    expect(() =>
      mergeServerChange(state, domainA, { ...createChange("task-1", 1, "Different state") }),
    ).toThrow("entity version");
  });

  it("keeps tombstones and blocks older live data from returning", () => {
    const live = createChange("task-1", 1, "First");
    const tombstone: SyncChange = {
      changeId: "delete-task-1",
      collection: "tasks",
      deleted: true,
      entityId: "task-1",
      format: 1,
      version: { counter: 2, replicaId: "replica-a" },
    };
    const deleted = mergeServerChanges(createLatestSyncState(), domainA, [live, tombstone]);
    const afterRetry = mergeServerChange(deleted, domainA, live).state;

    expect(afterRetry.records).toHaveLength(1);
    expect(afterRetry.records[0]?.change).toEqual(tombstone);
  });

  it("paginates by server sequence even after records are replaced", () => {
    let state = mergeServerChanges(createLatestSyncState(), domainA, [
      createChange("task-1", 1, "First"),
      createChange("task-2", 1, "Second"),
      createChange("task-3", 1, "Third"),
    ]);
    state = mergeServerChange(state, domainA, createChange("task-1", 2, "Updated")).state;

    const firstPage = pullLatestSyncRecords(state, { appDomain: domainA, cursor: null, limit: 2 });
    const secondPage = pullLatestSyncRecords(state, {
      appDomain: domainA,
      cursor: firstPage.cursor,
      limit: 2,
    });

    expect(firstPage.changes.map(({ entityId }) => entityId)).toEqual(["task-2", "task-3"]);
    expect(firstPage).toMatchObject({ cursor: "3", hasMore: true });
    expect(secondPage.changes).toEqual([createChange("task-1", 2, "Updated")]);
    expect(secondPage).toMatchObject({ cursor: "4", hasMore: false });
  });

  it("isolates app domains while sharing a durable sequence", () => {
    let state = mergeServerChange(
      createLatestSyncState(),
      domainA,
      createChange("task-1", 1, "Domain A"),
    ).state;
    state = mergeServerChange(state, domainB, createChange("task-1", 1, "Domain B")).state;

    expect(
      pullLatestSyncRecords(state, { appDomain: domainA, cursor: null, limit: 10 }).changes,
    ).toEqual([createChange("task-1", 1, "Domain A")]);
    expect(
      pullLatestSyncRecords(state, { appDomain: domainB, cursor: null, limit: 10 }).changes,
    ).toEqual([createChange("task-1", 1, "Domain B")]);
  });

  it("restores validated state after a restart", () => {
    const beforeRestart = mergeServerChange(
      createLatestSyncState(),
      domainA,
      createChange("task-1", 1, "Before restart"),
    ).state;
    const serialized = JSON.parse(JSON.stringify(beforeRestart)) as unknown;
    const restored = restoreLatestSyncState(serialized, validateSyncChange);
    const afterRestart = mergeServerChange(
      restored,
      domainA,
      createChange("task-2", 2, "After restart"),
    ).state;

    expect(afterRestart.sequence).toBe("2");
    expect(afterRestart.records).toHaveLength(2);
  });

  it("routes encrypted records by their own app domain", () => {
    const encrypted: EncryptedSyncRecord = {
      appDomain: domainA,
      changeId: "change-task-1",
      collection: "tasks",
      entityId: "task-1",
      format: 1,
      keyId: "main-key",
      payload: "1.nonce.ciphertext",
      version: { counter: 1, replicaId: "replica-a" },
    };
    const state = mergeServerChange(
      createLatestSyncState<EncryptedSyncRecord>(),
      domainA,
      encrypted,
    ).state;

    expect(
      pullLatestSyncRecords(state, { appDomain: domainA, cursor: null, limit: 10 }).changes,
    ).toEqual([encrypted]);
    expect(() => mergeServerChange(state, domainB, encrypted)).toThrow("app domain");
  });

  it("uses canonical decimal cursors beyond the safe integer range", () => {
    const large = "90071992547409931234567890";
    expect(parsePullCursor(large)).toBe(90_071_992_547_409_931_234_567_890n);
    expect(nextServerSequence(large)).toBe("90071992547409931234567891");
    expect(createPullCursor(90_071_992_547_409_931_234_567_890n)).toBe(large);
    expect(() => parsePullCursor("01")).toThrow("canonical decimal");
  });
});

const domainA = "com.example.tasks";
const domainB = "com.example.notes";

function createChange(entityId: string, counter: number, title: string): SyncChange {
  return {
    changeId: `change-${entityId}-${counter}-${title}`,
    collection: "tasks",
    deleted: false,
    entity: { title },
    entityId,
    format: 1,
    version: { counter, replicaId: "replica-a" },
  };
}
