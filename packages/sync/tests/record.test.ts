import { describe, expect, it } from "vite-plus/test";
import type { SyncChange } from "../src/change.ts";
import { decodeSyncRecord, encodeSyncChange } from "../src/record.ts";

describe("sync records", () => {
  it("round trips live entities and tombstones as opaque payload strings", () => {
    const live = createLiveChange();
    const tombstone: SyncChange = {
      changeId: "delete-task-2",
      collection: "tasks",
      deleted: true,
      entityId: "task-2",
      format: 1,
      version: { counter: 3, replicaId: "replica-a" },
    };

    const liveRecord = encodeSyncChange(live, "com.example.tasks");
    const tombstoneRecord = encodeSyncChange(tombstone, "com.example.tasks");

    expect(liveRecord).not.toHaveProperty("deleted");
    expect(typeof liveRecord.payload).toBe("string");
    expect(decodeSyncRecord(liveRecord)).toEqual(live);
    expect(decodeSyncRecord(tombstoneRecord)).toEqual(tombstone);
  });

  it("rejects malformed plaintext payloads", () => {
    const record = encodeSyncChange(createLiveChange(), "com.example.tasks");
    expect(() => decodeSyncRecord({ ...record, payload: "not JSON" })).toThrow("valid JSON");
    expect(() => decodeSyncRecord({ ...record, payload: "{}" })).toThrow("entity state");
  });
});

function createLiveChange(): SyncChange {
  return {
    changeId: "change-task-1",
    collection: "tasks",
    deleted: false,
    entity: { title: "Write docs" },
    entityId: "task-1",
    format: 1,
    version: { counter: 2, replicaId: "replica-a" },
  };
}
