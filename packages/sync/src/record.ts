import { assertNonemptyString } from "./assert.ts";
import { validateSyncChange } from "./change.ts";
import type { SyncChange } from "./change.ts";
import { assertVersion } from "./clock.ts";
import type { Version } from "./clock.ts";

export type SyncRecord = Readonly<{
  appDomain: string;
  changeId: string;
  collection: string;
  entityId: string;
  format: 1;
  payload: string;
  version: Version;
}>;

export function encodeSyncChange(changeValue: SyncChange, appDomain: string): SyncRecord {
  const change = validateSyncChange(changeValue);
  return { ...createRecordHeader(change, appDomain), payload: encodePayloadState(change) };
}

export function decodeSyncRecord(recordValue: SyncRecord): SyncChange {
  const record = validateSyncRecord(recordValue);
  return decodeSyncPayload(record, record.payload, "A sync payload");
}

export function validateSyncRecord(value: unknown): SyncRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("A sync record must be an object.");
  }
  const record = value as Partial<SyncRecord>;
  if (record.format !== 1) throw new TypeError("A sync record has an unsupported format.");
  assertNonemptyString(record.appDomain, "app domain");
  assertNonemptyString(record.changeId, "change ID");
  assertNonemptyString(record.collection, "collection");
  assertNonemptyString(record.entityId, "entity ID");
  assertNonemptyString(record.payload, "payload");
  assertVersion(record.version);
  return record as SyncRecord;
}

/** Builds the cleartext fields that every sync record carries alongside its payload. */
export function createRecordHeader(
  change: SyncChange,
  appDomain: string,
): Omit<SyncRecord, "payload"> {
  assertNonemptyString(appDomain, "app domain");
  return {
    appDomain,
    changeId: change.changeId,
    collection: change.collection,
    entityId: change.entityId,
    format: 1,
    version: { ...change.version },
  };
}

/** Serializes the entity state that both plaintext and encrypted payloads wrap. */
export function encodePayloadState(change: SyncChange): string {
  // validateSyncChange already proved the entity encodes, so this cannot fail.
  return JSON.stringify(
    change.deleted ? { deleted: true } : { deleted: false, entity: change.entity },
  );
}

/** Reads a payload that {@link encodePayloadState} produced, as text or as decrypted bytes. */
export function decodeSyncPayload(
  record: SyncRecord,
  payload: string | BufferSource,
  description: string,
): SyncChange {
  let state: unknown;
  try {
    const text =
      typeof payload === "string"
        ? payload
        : new TextDecoder("utf-8", { fatal: true }).decode(payload);
    state = JSON.parse(text) as unknown;
  } catch (cause) {
    throw new TypeError(`${description} does not contain valid JSON.`, { cause });
  }
  return createSyncChange(record, state, description);
}

function createSyncChange(record: SyncRecord, state: unknown, description: string): SyncChange {
  if (state === null || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError(`${description} must contain an entity state.`);
  }
  const candidate = state as Record<string, unknown>;
  const base = {
    changeId: record.changeId,
    collection: record.collection,
    entityId: record.entityId,
    format: 1 as const,
    version: { ...record.version },
  };
  // The record was already validated and JSON.parse output always encodes, so the
  // assembled change satisfies validateSyncChange by construction.
  if (candidate.deleted === true) return { ...base, deleted: true };
  if (candidate.deleted === false && Object.hasOwn(candidate, "entity")) {
    return { ...base, deleted: false, entity: candidate.entity };
  }
  throw new TypeError(`${description} has an invalid entity state.`);
}
