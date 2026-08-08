import { assertNonemptyString } from "./assert.ts";
import { validateSyncChange } from "./change.ts";
import type { SyncChange } from "./change.ts";
import { assertVersion } from "./clock.ts";
import type { Version } from "./clock.ts";

const algorithm = "AES-GCM";
const nonceLength = 12;

export type EncryptedSyncRecord = Readonly<{
  appDomain: string;
  changeId: string;
  collection: string;
  entityId: string;
  format: 1;
  keyId: string;
  payload: string;
  version: Version;
}>;

export type EncryptSyncChangeOptions = Readonly<{
  appDomain: string;
  key: CryptoKey;
  keyId: string;
}>;

export type DecryptSyncRecordOptions = Readonly<{
  key: CryptoKey;
}>;

export async function encryptSyncChange(
  changeValue: SyncChange,
  options: EncryptSyncChangeOptions,
): Promise<EncryptedSyncRecord> {
  const change = validateSyncChange(changeValue);
  assertNonemptyString(options.appDomain, "app domain");
  assertNonemptyString(options.keyId, "encryption key ID");

  const record = {
    appDomain: options.appDomain,
    changeId: change.changeId,
    collection: change.collection,
    entityId: change.entityId,
    format: 1 as const,
    keyId: options.keyId,
    version: { ...change.version },
  };
  const nonce = crypto.getRandomValues(new Uint8Array(nonceLength));
  const plaintext = new TextEncoder().encode(
    JSON.stringify(change.deleted ? { deleted: true } : { deleted: false, entity: change.entity }),
  );
  const ciphertext = await crypto.subtle.encrypt(
    { additionalData: createAdditionalData(record), iv: nonce, name: algorithm },
    options.key,
    plaintext,
  );
  return {
    ...record,
    payload: `1.${encodeBase64Url(nonce)}.${encodeBase64Url(new Uint8Array(ciphertext))}`,
  };
}

export async function decryptSyncRecord(
  recordValue: EncryptedSyncRecord,
  options: DecryptSyncRecordOptions,
): Promise<SyncChange> {
  const record = validateEncryptedSyncRecord(recordValue);
  const payloadParts = record.payload.split(".");
  const [payloadFormat, encodedNonce, encodedCiphertext] = payloadParts;
  if (
    payloadParts.length !== 3 ||
    payloadFormat !== "1" ||
    encodedNonce === undefined ||
    encodedCiphertext === undefined
  ) {
    throw new TypeError("An encrypted sync payload has an unsupported format.");
  }
  const nonce = decodeBase64Url(encodedNonce);
  if (nonce.byteLength !== nonceLength) {
    throw new TypeError("An encrypted sync payload has an invalid nonce.");
  }
  const ciphertext = decodeBase64Url(encodedCiphertext);
  const plaintext = await crypto.subtle.decrypt(
    { additionalData: createAdditionalData(record), iv: nonce, name: algorithm },
    options.key,
    ciphertext,
  );

  let state: unknown;
  try {
    state = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext)) as unknown;
  } catch (cause) {
    throw new TypeError("An encrypted sync payload does not contain valid JSON.", { cause });
  }
  if (state === null || typeof state !== "object" || Array.isArray(state)) {
    throw new TypeError("An encrypted sync payload must contain an entity state.");
  }

  const candidate = state as Record<string, unknown>;
  const base = {
    changeId: record.changeId,
    collection: record.collection,
    entityId: record.entityId,
    format: 1 as const,
    version: { ...record.version },
  };
  if (candidate.deleted === true) return validateSyncChange({ ...base, deleted: true });
  if (candidate.deleted === false && Object.prototype.hasOwnProperty.call(candidate, "entity")) {
    return validateSyncChange({ ...base, deleted: false, entity: candidate.entity });
  }
  throw new TypeError("An encrypted sync payload has an invalid entity state.");
}

export function validateEncryptedSyncRecord(value: unknown): EncryptedSyncRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("An encrypted sync record must be an object.");
  }
  const record = value as Partial<EncryptedSyncRecord>;
  if (record.format !== 1) {
    throw new TypeError("An encrypted sync record has an unsupported format.");
  }
  assertNonemptyString(record.appDomain, "app domain");
  assertNonemptyString(record.changeId, "change ID");
  assertNonemptyString(record.collection, "collection");
  assertNonemptyString(record.entityId, "entity ID");
  assertNonemptyString(record.keyId, "encryption key ID");
  assertNonemptyString(record.payload, "encrypted payload");
  assertVersion(record.version);
  return record as EncryptedSyncRecord;
}

function createAdditionalData(
  record: Omit<EncryptedSyncRecord, "payload">,
): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    JSON.stringify([
      record.format,
      record.appDomain,
      record.changeId,
      record.collection,
      record.entityId,
      record.version.counter,
      record.version.replicaId,
      record.keyId,
    ]),
  );
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(encoded: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/u.test(encoded)) {
    throw new TypeError("An encrypted sync payload contains invalid base64url data.");
  }
  const padding = "=".repeat((4 - (encoded.length % 4)) % 4);
  let binary: string;
  try {
    binary = atob(encoded.replaceAll("-", "+").replaceAll("_", "/") + padding);
  } catch (cause) {
    throw new TypeError("An encrypted sync payload contains invalid base64url data.", { cause });
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  if (encodeBase64Url(bytes) !== encoded) {
    throw new TypeError("An encrypted sync payload contains noncanonical base64url data.");
  }
  return bytes;
}
