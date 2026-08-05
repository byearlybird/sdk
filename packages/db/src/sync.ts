import { assertVersion, compareVersions, observeVersion } from "./clock.ts";
import type { LamportClock, Version } from "./clock.ts";
import { encodeEntity, equalJson } from "./json.ts";
import {
  createClearOutboxCommand,
  createClockCommand,
  createEntityCommand,
  readStoredRecord,
  recordKey,
} from "./records.ts";
import type { MutationExecution, StoredRecord, UntypedDatabaseChange } from "./records.ts";
import type { StorageConnection } from "./storage.ts";

export type SyncChange =
  | Readonly<{
      changeId: string;
      collection: string;
      deleted: false;
      entity: unknown;
      entityId: string;
      format: 1;
      version: Version;
    }>
  | Readonly<{
      changeId: string;
      collection: string;
      deleted: true;
      entityId: string;
      format: 1;
      version: Version;
    }>;

type NormalizedSyncChange = Readonly<{
  changeId: string;
  collection: string;
  deleted: boolean;
  encodedEntity: null | string;
  entityId: string;
  version: Version;
}>;

export function normalizeSyncChanges(changes: readonly SyncChange[]): NormalizedSyncChange[] {
  if (!Array.isArray(changes)) throw new TypeError("Remote sync changes must be an array.");

  const changeIds = new Set<string>();
  return changes.map((change) => {
    if (change === null || typeof change !== "object" || Array.isArray(change)) {
      throw new TypeError("A remote sync change must be an object.");
    }
    if (change.format !== 1) throw new TypeError("A remote sync change has an unsupported format.");
    assertNonemptyString(change.changeId, "change ID");
    assertNonemptyString(change.collection, "collection");
    assertNonemptyString(change.entityId, "entity ID");
    if (changeIds.has(change.changeId)) {
      throw new TypeError(`Remote sync change ID "${change.changeId}" is duplicated.`);
    }
    changeIds.add(change.changeId);
    assertVersion(change.version);
    if (typeof change.deleted !== "boolean") {
      throw new TypeError("A remote sync change deleted flag must be boolean.");
    }
    const hasEntity = Object.prototype.hasOwnProperty.call(change, "entity");
    if (change.deleted && hasEntity) {
      throw new TypeError("A remote sync tombstone cannot contain an entity.");
    }
    if (!change.deleted && !hasEntity) {
      throw new TypeError("A remote live sync change must contain an entity.");
    }

    const encodedEntity = change.deleted ? null : encodeEntity(change.entity);
    return Object.freeze({
      changeId: change.changeId,
      collection: change.collection,
      deleted: change.deleted,
      encodedEntity,
      entityId: change.entityId,
      version: Object.freeze({ ...change.version }),
    });
  });
}

export function normalizePendingLimit(limit: number): number {
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new RangeError("A pending sync change limit must be a positive safe integer.");
  }
  return limit;
}

export function normalizeSyncCheckpoint(checkpoint: unknown): string {
  if (typeof checkpoint !== "string" || checkpoint.length === 0) {
    throw new TypeError("A synchronization checkpoint must be a nonempty string.");
  }
  return checkpoint;
}

export function normalizeAcknowledgments(changeIds: readonly string[]): string[] {
  if (!Array.isArray(changeIds)) throw new TypeError("Sync acknowledgments must be an array.");
  const unique = new Set<string>();
  for (const changeId of changeIds) {
    assertNonemptyString(changeId, "acknowledged change ID");
    unique.add(changeId);
  }
  return [...unique];
}

export async function planRemoteChanges(
  connection: StorageConnection,
  initialClock: LamportClock,
  incomingChanges: readonly NormalizedSyncChange[],
): Promise<MutationExecution<void>> {
  const initialRecords = new Map<string, StoredRecord | null>();
  const currentRecords = new Map<string, StoredRecord | null>();
  const coordinates = new Map<string, Readonly<{ collection: string; id: string }>>();
  const changedKeys = new Set<string>();
  const clearOutboxKeys = new Set<string>();
  let clock = initialClock;

  async function getRecord(collection: string, id: string): Promise<StoredRecord | null> {
    const key = recordKey(collection, id);
    if (!currentRecords.has(key)) {
      const record = await readStoredRecord(connection, collection, id);
      initialRecords.set(key, record);
      currentRecords.set(key, record);
      coordinates.set(key, { collection, id });
    }
    return currentRecords.get(key) ?? null;
  }

  for (const incoming of incomingChanges) {
    clock = observeVersion(clock, incoming.version);
    const key = recordKey(incoming.collection, incoming.entityId);
    const current = await getRecord(incoming.collection, incoming.entityId);
    const initial = initialRecords.get(key) ?? null;
    if (
      initial?.outboxChangeId !== undefined &&
      compareVersions(incoming.version, initial.version) >= 0
    ) {
      clearOutboxKeys.add(key);
    }
    if (current !== null) {
      const comparison = compareVersions(incoming.version, current.version);
      if (comparison === 0 && !sameRecordState(incoming, current)) {
        throw new TypeError(
          "Remote sync changes cannot reuse a version for different entity state.",
        );
      }
      if (comparison <= 0) continue;
    }

    currentRecords.set(key, {
      deleted: incoming.deleted,
      encodedEntity: incoming.encodedEntity,
      version: incoming.version,
    });
    changedKeys.add(key);
  }

  const commands = [];
  const changes: UntypedDatabaseChange[] = [];
  for (const key of changedKeys) {
    const coordinate = coordinates.get(key);
    const current = currentRecords.get(key);
    const initial = initialRecords.get(key) ?? null;
    if (coordinate === undefined || current === undefined || current === null) {
      throw new TypeError("Remote sync planning produced an invalid entity state.");
    }
    commands.push(createEntityCommand(coordinate.collection, coordinate.id, current));
    const visibleChange = classifyVisibleChange(initial, current, coordinate);
    if (visibleChange !== undefined) changes.push(visibleChange);
  }
  for (const key of clearOutboxKeys) {
    const coordinate = coordinates.get(key);
    if (coordinate !== undefined) {
      commands.push(createClearOutboxCommand(coordinate.collection, coordinate.id));
    }
  }
  if (clock.counter !== initialClock.counter) commands.push(createClockCommand(clock));

  return { changes, commands, nextClock: clock, value: undefined };
}

function sameRecordState(
  incoming: Pick<NormalizedSyncChange, "deleted" | "encodedEntity">,
  current: Pick<StoredRecord, "deleted" | "encodedEntity">,
): boolean {
  if (incoming.deleted !== current.deleted) return false;
  if (incoming.encodedEntity === current.encodedEntity) return true;
  if (incoming.encodedEntity === null || current.encodedEntity === null) return false;
  return equalJson(
    JSON.parse(incoming.encodedEntity) as unknown,
    JSON.parse(current.encodedEntity) as unknown,
  );
}

function classifyVisibleChange(
  initial: StoredRecord | null,
  current: StoredRecord,
  coordinate: Readonly<{ collection: string; id: string }>,
): UntypedDatabaseChange | undefined {
  const initiallyVisible = initial !== null && !initial.deleted;
  const currentlyVisible = !current.deleted;
  if (!initiallyVisible && !currentlyVisible) return undefined;
  return {
    collection: coordinate.collection,
    id: coordinate.id,
    operation: !initiallyVisible ? "insert" : currentlyVisible ? "update" : "delete",
  };
}

function assertNonemptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`A sync ${label} must be a nonempty string.`);
  }
}
