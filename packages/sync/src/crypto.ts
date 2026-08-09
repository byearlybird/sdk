import { validateSyncChange } from "./change.ts";
import type { SyncChange } from "./change.ts";
import {
  createRecordHeader,
  decodeSyncPayload,
  encodePayloadState,
  validateSyncRecord,
} from "./record.ts";
import type { SyncRecord } from "./record.ts";

const algorithm = "AES-GCM";
const nonceLength = 12;

export type EncryptSyncChangeOptions = Readonly<{
  appDomain: string;
  key: CryptoKey;
}>;

export type DecryptSyncRecordOptions = Readonly<{
  key: CryptoKey;
}>;

export async function encryptSyncChange(
  changeValue: SyncChange,
  options: EncryptSyncChangeOptions,
): Promise<SyncRecord> {
  const change = validateSyncChange(changeValue);
  const record = createRecordHeader(change, options.appDomain);
  const nonce = crypto.getRandomValues(new Uint8Array(nonceLength));
  const plaintext = new TextEncoder().encode(encodePayloadState(change));
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
  recordValue: SyncRecord,
  options: DecryptSyncRecordOptions,
): Promise<SyncChange> {
  const record = validateSyncRecord(recordValue);
  const payloadParts = record.payload.split(".");
  const [payloadFormat, encodedNonce, encodedCiphertext] = payloadParts;
  if (payloadParts.length !== 3 || payloadFormat !== "1") {
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

  return decodeSyncPayload(record, plaintext, "An encrypted sync payload");
}

function createAdditionalData(record: Omit<SyncRecord, "payload">): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(
    JSON.stringify([
      record.format,
      record.appDomain,
      record.changeId,
      record.collection,
      record.entityId,
      record.version.counter,
      record.version.replicaId,
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
  return bytes;
}
