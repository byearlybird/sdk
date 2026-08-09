import { describe, expect, it } from "vite-plus/test";
import type { SyncChange } from "../src/change.ts";
import { decryptSyncRecord, encryptSyncChange } from "../src/crypto.ts";
import { validateSyncRecord } from "../src/record.ts";

describe("encrypted sync records", () => {
  it("round trips live entities and tombstones", async () => {
    const key = await createKey();
    const live = createLiveChange();
    const tombstone: SyncChange = {
      changeId: "delete-task-2",
      collection: "tasks",
      deleted: true,
      entityId: "task-2",
      format: 1,
      version: { counter: 3, replicaId: "replica-a" },
    };

    const encryptedLive = await encryptSyncChange(live, {
      appDomain: "com.example.tasks",
      key,
    });
    const encryptedTombstone = await encryptSyncChange(tombstone, {
      appDomain: "com.example.tasks",
      key,
    });

    expect(encryptedLive).not.toHaveProperty("deleted");
    expect(encryptedLive.payload).not.toContain("秘密");
    await expect(decryptSyncRecord(encryptedLive, { key })).resolves.toEqual(live);
    await expect(decryptSyncRecord(encryptedTombstone, { key })).resolves.toEqual(tombstone);
  });

  it("uses a fresh nonce for each encryption", async () => {
    const key = await createKey();
    const options = { appDomain: "com.example.tasks", key };
    const first = await encryptSyncChange(createLiveChange(), options);
    const second = await encryptSyncChange(createLiveChange(), options);

    expect(first.payload).not.toBe(second.payload);
  });

  it("rejects the wrong key and authenticated metadata changes", async () => {
    const key = await createKey();
    const encrypted = await encryptSyncChange(createLiveChange(), {
      appDomain: "com.example.tasks",
      key,
    });

    await expect(decryptSyncRecord(encrypted, { key: await createKey() })).rejects.toThrow();
    await expect(
      decryptSyncRecord({ ...encrypted, entityId: "another-task" }, { key }),
    ).rejects.toThrow();
  });

  it("rejects malformed encrypted records before decryption", () => {
    expect(() => validateSyncRecord({ payload: "bad" })).toThrow("unsupported format");
    expect(() =>
      validateSyncRecord({
        appDomain: "com.example.tasks",
        changeId: "change-task-1",
        collection: "tasks",
        entityId: "task-1",
        format: 1,
        payload: "",
        version: { counter: 1, replicaId: "replica-a" },
      }),
    ).toThrow("payload");
  });
});

async function createKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ length: 256, name: "AES-GCM" }, false, ["decrypt", "encrypt"]);
}

function createLiveChange(): SyncChange {
  return {
    changeId: "change-task-1",
    collection: "tasks",
    deleted: false,
    entity: { title: "秘密 task 👋" },
    entityId: "task-1",
    format: 1,
    version: { counter: 2, replicaId: "replica-a" },
  };
}
