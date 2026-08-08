import { assertNonemptyString } from "./assert.ts";
import { assertVersion } from "./clock.ts";
import type { Version } from "./clock.ts";
import { encodeJson } from "./json.ts";

export type LiveSyncChange = Readonly<{
  changeId: string;
  collection: string;
  deleted: false;
  entity: unknown;
  entityId: string;
  format: 1;
  version: Version;
}>;

export type SyncTombstone = Readonly<{
  changeId: string;
  collection: string;
  deleted: true;
  entityId: string;
  format: 1;
  version: Version;
}>;

export type SyncChange = LiveSyncChange | SyncTombstone;

export function validateSyncChange(value: unknown): SyncChange {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("A sync change must be an object.");
  }

  const change = value as Partial<SyncChange> & Record<string, unknown>;
  if (change.format !== 1) throw new TypeError("A sync change has an unsupported format.");
  assertNonemptyString(change.changeId, "change ID");
  assertNonemptyString(change.collection, "collection");
  assertNonemptyString(change.entityId, "entity ID");
  assertVersion(change.version);
  if (typeof change.deleted !== "boolean") {
    throw new TypeError("A sync change deleted flag must be boolean.");
  }

  const hasEntity = Object.prototype.hasOwnProperty.call(change, "entity");
  if (change.deleted && hasEntity) {
    throw new TypeError("A sync tombstone cannot contain an entity.");
  }
  if (!change.deleted && !hasEntity) {
    throw new TypeError("A live sync change must contain an entity.");
  }
  // A change that cannot round-trip through JSON would not survive durable storage.
  if (!change.deleted) encodeJson(change.entity, "sync entity");

  return change as SyncChange;
}

export function validateSyncChanges(value: unknown): readonly SyncChange[] {
  if (!Array.isArray(value)) throw new TypeError("Sync changes must be an array.");

  const changeIds = new Set<string>();
  return value.map((candidate) => {
    const change = validateSyncChange(candidate);
    if (changeIds.has(change.changeId)) {
      throw new TypeError(`Sync change ID "${change.changeId}" is duplicated.`);
    }
    changeIds.add(change.changeId);
    return change;
  });
}
