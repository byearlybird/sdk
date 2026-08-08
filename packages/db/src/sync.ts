import { compareVersions, observeVersion, validateSyncChanges } from "@byearlybird/sync";
import type { LamportClock, SyncChange, Version } from "@byearlybird/sync";
import { equalJson } from "./json.ts";
import {
  createClearOutboxCommand,
  createClockCommand,
  createEntityCommand,
  readStoredRecord,
  recordKey,
} from "./records.ts";
import type { MutationExecution, StoredRecord, UntypedDatabaseChange } from "./records.ts";
import type { StorageConnection } from "./storage.ts";

type NormalizedSyncChange = Readonly<{
  changeId: string;
  collection: string;
  deleted: boolean;
  encodedEntity: null | string;
  entityId: string;
  version: Version;
}>;

export function normalizeSyncChanges(changes: readonly SyncChange[]): NormalizedSyncChange[] {
  return validateSyncChanges(changes).map((change) => {
    // validateSyncChanges already proved every live entity encodes, so this cannot fail.
    const encodedEntity = change.deleted ? null : JSON.stringify(change.entity);
    return {
      changeId: change.changeId,
      collection: change.collection,
      deleted: change.deleted,
      encodedEntity,
      entityId: change.entityId,
      // Copied so a caller mutating its input cannot alter an in-flight plan.
      version: { ...change.version },
    };
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

type PlannedEntity = {
  clearOutbox: boolean;
  readonly collection: string;
  current: StoredRecord | null;
  readonly id: string;
  readonly initial: StoredRecord | null;
};

export async function planRemoteChanges(
  connection: StorageConnection,
  initialClock: LamportClock,
  incomingChanges: readonly NormalizedSyncChange[],
): Promise<MutationExecution<void>> {
  const entities = new Map<string, PlannedEntity>();
  const changed = new Map<PlannedEntity, StoredRecord>();
  let clock = initialClock;

  async function getEntity(collection: string, id: string): Promise<PlannedEntity> {
    const key = recordKey(collection, id);
    let entity = entities.get(key);
    if (entity === undefined) {
      const record = await readStoredRecord(connection, collection, id);
      entity = { clearOutbox: false, collection, current: record, id, initial: record };
      entities.set(key, entity);
    }
    return entity;
  }

  for (const incoming of incomingChanges) {
    clock = observeVersion(clock, incoming.version);
    const entity = await getEntity(incoming.collection, incoming.entityId);
    const { current, initial } = entity;
    if (
      initial?.outboxChangeId !== undefined &&
      compareVersions(incoming.version, initial.version) >= 0
    ) {
      entity.clearOutbox = true;
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

    const record: StoredRecord = {
      deleted: incoming.deleted,
      encodedEntity: incoming.encodedEntity,
      version: incoming.version,
    };
    entity.current = record;
    changed.set(entity, record);
  }

  const commands = [];
  const changes: UntypedDatabaseChange[] = [];
  for (const [entity, record] of changed) {
    commands.push(createEntityCommand(entity.collection, entity.id, record));
    const visibleChange = classifyVisibleChange(entity.initial, record, entity);
    if (visibleChange !== undefined) changes.push(visibleChange);
  }
  for (const { clearOutbox, collection, id } of entities.values()) {
    if (clearOutbox) commands.push(createClearOutboxCommand(collection, id));
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
