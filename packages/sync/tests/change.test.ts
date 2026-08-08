import { describe, expect, it } from "vite-plus/test";
import { validateSyncChange, validateSyncChanges } from "../src/change.ts";

describe("sync changes", () => {
  it("accepts live entities and tombstones", () => {
    expect(validateSyncChange(createLiveChange())).toEqual(createLiveChange());
    expect(
      validateSyncChange({
        changeId: "delete-task-1",
        collection: "tasks",
        deleted: true,
        entityId: "task-1",
        format: 1,
        version: { counter: 2, replicaId: "replica-a" },
      }),
    ).toMatchObject({ deleted: true, entityId: "task-1" });
  });

  it("rejects malformed changes, invalid entities, and duplicate change IDs", () => {
    expect(() => validateSyncChange({ ...createLiveChange(), entity: undefined })).toThrow(
      "JSON-serializable",
    );
    expect(() => validateSyncChange({ ...createLiveChange(), changeId: "" })).toThrow("change ID");
    expect(() => validateSyncChanges([createLiveChange(), createLiveChange()])).toThrow(
      "duplicated",
    );
  });
});

function createLiveChange() {
  return {
    changeId: "change-task-1",
    collection: "tasks",
    deleted: false as const,
    entity: { title: "Write tests" },
    entityId: "task-1",
    format: 1 as const,
    version: { counter: 1, replicaId: "replica-a" },
  };
}
