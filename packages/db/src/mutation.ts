import { tickLamportClock } from "./clock.ts";
import type { LamportClock } from "./clock.ts";
import { encodeEntity } from "./json.ts";
import {
  createClockCommand,
  createEntityCommand,
  createOutboxCommand,
  readStoredRecord,
  recordKey,
} from "./records.ts";
import type { MutationExecution, StoredRecord, UntypedDatabaseChange } from "./records.ts";
import type { StorageConnection } from "./storage.ts";

export type MutationIntent =
  | Readonly<{
      collection: string;
      data: unknown;
      id: string;
      operation: "insert";
    }>
  | Readonly<{
      changes: Readonly<Record<string, unknown>>;
      collection: string;
      id: string;
      operation: "patch";
    }>
  | Readonly<{
      collection: string;
      id: string;
      operation: "delete";
    }>;

type PreparedMutation =
  | Readonly<{
      collection: string;
      encodedData: string;
      id: string;
      operation: "insert";
    }>
  | Readonly<{
      collection: string;
      entries: readonly (readonly [string, string])[];
      id: string;
      operation: "patch";
    }>
  | Readonly<{
      collection: string;
      id: string;
      operation: "delete";
    }>;

type PlannedRecord = StoredRecord & Readonly<{ changeId: string }>;

export function prepareMutation(intent: MutationIntent): PreparedMutation {
  if (intent.collection.length === 0) throw new TypeError("A collection name cannot be empty.");
  if (intent.id.length === 0) throw new TypeError("An entity ID cannot be empty.");
  switch (intent.operation) {
    case "insert":
      return {
        collection: intent.collection,
        encodedData: encodeEntity(intent.data),
        id: intent.id,
        operation: intent.operation,
      };
    case "patch": {
      if (
        intent.changes === null ||
        typeof intent.changes !== "object" ||
        Array.isArray(intent.changes)
      ) {
        throw new TypeError("Database patches must be objects.");
      }
      return {
        collection: intent.collection,
        entries: Object.entries(intent.changes).map(
          ([key, value]) => [key, encodeEntity(value)] as const,
        ),
        id: intent.id,
        operation: intent.operation,
      };
    }
    case "delete":
      return intent;
  }
}

export async function planLocalMutations(
  connection: StorageConnection,
  initialClock: LamportClock,
  mutations: readonly PreparedMutation[],
): Promise<MutationExecution<readonly (boolean | undefined)[]>> {
  if (mutations.length === 0) {
    return { changes: [], commands: [], nextClock: initialClock, value: [] };
  }

  const loaded = new Map<string, StoredRecord | null>();
  const changed = new Map<
    string,
    Readonly<{ collection: string; id: string; record: PlannedRecord }>
  >();
  const changes: UntypedDatabaseChange[] = [];
  const values: (boolean | undefined)[] = [];
  let clock = initialClock;

  async function getRecord(collection: string, id: string): Promise<StoredRecord | null> {
    const key = recordKey(collection, id);
    if (!loaded.has(key)) loaded.set(key, await readStoredRecord(connection, collection, id));
    return loaded.get(key) ?? null;
  }

  function setRecord(collection: string, id: string, record: PlannedRecord): void {
    const key = recordKey(collection, id);
    loaded.set(key, record);
    changed.set(key, { collection, id, record });
  }

  for (const mutation of mutations) {
    const existing = await getRecord(mutation.collection, mutation.id);
    switch (mutation.operation) {
      case "insert": {
        if (existing !== null && !existing.deleted) {
          throw new Error(
            `Entity "${mutation.id}" already exists in collection "${mutation.collection}".`,
          );
        }
        const tick = tickLamportClock(clock);
        clock = tick.clock;
        setRecord(mutation.collection, mutation.id, {
          changeId: crypto.randomUUID(),
          deleted: false,
          encodedEntity: mutation.encodedData,
          version: tick.version,
        });
        changes.push({
          collection: mutation.collection,
          id: mutation.id,
          operation: "insert",
        });
        values.push(undefined);
        break;
      }
      case "patch": {
        if (mutation.entries.length === 0) {
          values.push(existing !== null && !existing.deleted);
          break;
        }
        if (existing === null || existing.deleted) {
          values.push(false);
          break;
        }
        const tick = tickLamportClock(clock);
        clock = tick.clock;
        setRecord(mutation.collection, mutation.id, {
          changeId: crypto.randomUUID(),
          deleted: false,
          encodedEntity: applyEncodedPatch(existing.encodedEntity, mutation.entries),
          version: tick.version,
        });
        changes.push({
          collection: mutation.collection,
          id: mutation.id,
          operation: "update",
        });
        values.push(true);
        break;
      }
      case "delete": {
        if (existing === null || existing.deleted) {
          values.push(false);
          break;
        }
        const tick = tickLamportClock(clock);
        clock = tick.clock;
        setRecord(mutation.collection, mutation.id, {
          changeId: crypto.randomUUID(),
          deleted: true,
          encodedEntity: null,
          version: tick.version,
        });
        changes.push({
          collection: mutation.collection,
          id: mutation.id,
          operation: "delete",
        });
        values.push(true);
        break;
      }
    }
  }

  if (changed.size === 0) {
    return { changes: [], commands: [], nextClock: initialClock, value: values };
  }

  const commands = [...changed.values()].flatMap(({ collection, id, record }) => [
    createEntityCommand(collection, id, record),
    createOutboxCommand(collection, id, record.changeId),
  ]);
  commands.push(createClockCommand(clock));
  return { changes, commands, nextClock: clock, value: values };
}

function applyEncodedPatch(
  encodedEntity: null | string,
  entries: readonly (readonly [string, string])[],
): string {
  if (encodedEntity === null) throw new TypeError("A live database entity is missing its value.");
  const entity = JSON.parse(encodedEntity) as unknown;
  if (entity === null || typeof entity !== "object" || Array.isArray(entity)) {
    throw new TypeError("Only JSON objects can be patched.");
  }
  for (const [key, encodedValue] of entries) {
    Object.defineProperty(entity, key, {
      configurable: true,
      enumerable: true,
      value: JSON.parse(encodedValue) as unknown,
      writable: true,
    });
  }
  return encodeEntity(entity);
}
