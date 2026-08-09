const storageKey = "early-bird-demo-encryption";
const keyByteLength = 32;

const material = loadOrCreateKey();

export const demoEncryption = {
  key: importKey(material.keyBytes),
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
  const setupKey = encodeHex(keyBytes);
  localStorage.setItem(storageKey, setupKey);
  return { keyBytes, setupKey };
}

function parseSetupKey(value: string) {
  const setupKey = value.trim();
  if (!/^[0-9a-f]{64}$/u.test(setupKey)) {
    throw new TypeError("Enter a valid Early Bird demo setup key.");
  }

  return {
    keyBytes: Uint8Array.from(setupKey.matchAll(/../gu), ([byte]) => Number.parseInt(byte, 16)),
    setupKey,
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
