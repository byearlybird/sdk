const storageKey = "early-bird-demo-encryption";
const keyByteLength = 32;

const material = loadOrCreateKey();

export const demoEncryption = {
  key: importKey(material.keyBytes),
  keyId: material.keyId,
  setupKey: material.setupKey,
} as const;

export function saveSetupKey(value: string): void {
  const material = parseSetupKey(value);
  localStorage.setItem(storageKey, material.setupKey);
}

function loadOrCreateKey() {
  const stored = localStorage.getItem(storageKey);
  if (stored !== null) return parseSetupKey(stored);

  const keyBytes = crypto.getRandomValues(new Uint8Array(keyByteLength));
  const keyId = crypto.randomUUID();
  const setupKey = JSON.stringify({ key: encodeHex(keyBytes), keyId });
  localStorage.setItem(storageKey, setupKey);
  return { keyBytes, keyId, setupKey };
}

function parseSetupKey(value: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value.trim()) as unknown;
  } catch {
    throw new TypeError("Enter a valid Early Bird demo setup key.");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError("Enter a valid Early Bird demo setup key.");
  }

  const { key, keyId } = parsed as Record<string, unknown>;
  if (
    typeof key !== "string" ||
    !/^[0-9a-f]{64}$/u.test(key) ||
    typeof keyId !== "string" ||
    keyId.length === 0
  ) {
    throw new TypeError("Enter a valid Early Bird demo setup key.");
  }

  return {
    keyBytes: Uint8Array.from(key.matchAll(/../gu), ([byte]) => Number.parseInt(byte, 16)),
    keyId,
    setupKey: JSON.stringify({ key, keyId }),
  };
}

function importKey(keyBytes: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, [
    "decrypt",
    "encrypt",
  ]);
}

function encodeHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
