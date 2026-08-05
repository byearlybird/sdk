import type { SqliteBinding, StorageCommand, StorageCommandResult } from "./storage.ts";

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

export type MutationChange = Readonly<{
  collection: string;
  id: string;
  operation: "delete" | "insert" | "update";
}>;

export type MutationOutcome = Readonly<{
  change?: MutationChange;
  value: boolean | undefined;
}>;

export type CompiledMutation = Readonly<{
  command: StorageCommand;
  intent: MutationIntent;
}>;

export function compileMutation(intent: MutationIntent): CompiledMutation {
  switch (intent.operation) {
    case "insert":
      return {
        command: {
          bindings: [intent.collection, intent.id, encodeEntity(intent.data)],
          kind: "run",
          sql: `
            INSERT INTO entities (collection, entity_id, entity)
            VALUES (?, ?, ?)
          `,
        },
        intent,
      };
    case "patch": {
      const entries = Object.entries(intent.changes);
      if (entries.length === 0) {
        return {
          command: {
            bindings: [intent.collection, intent.id],
            kind: "query",
            sql: `
              SELECT entity_id
              FROM entities
              WHERE collection = ? AND entity_id = ?
            `,
          },
          intent,
        };
      }

      const patch = createJsonSetPatch(entries);
      return {
        command: {
          bindings: [...patch.bindings, intent.collection, intent.id],
          kind: "run",
          sql: `
            UPDATE entities
            SET entity = ${patch.expression}
            WHERE collection = ? AND entity_id = ?
          `,
        },
        intent,
      };
    }
    case "delete":
      return {
        command: {
          bindings: [intent.collection, intent.id],
          kind: "run",
          sql: `
            DELETE FROM entities
            WHERE collection = ? AND entity_id = ?
          `,
        },
        intent,
      };
  }
}

export function readMutationOutcome(
  mutation: CompiledMutation,
  result: StorageCommandResult,
): MutationOutcome {
  const { intent } = mutation;
  switch (intent.operation) {
    case "insert":
      assertResultKind(result, "run");
      return {
        change: {
          collection: intent.collection,
          id: intent.id,
          operation: "insert",
        },
        value: undefined,
      };
    case "patch": {
      if (mutation.command.kind === "query") {
        assertResultKind(result, "query");
        return { value: result.rows.length > 0 };
      }

      assertResultKind(result, "run");
      return changedOutcome(intent, "update", result.changes);
    }
    case "delete": {
      assertResultKind(result, "run");
      return changedOutcome(intent, "delete", result.changes);
    }
  }
}

function changedOutcome(
  intent: Pick<MutationIntent, "collection" | "id">,
  operation: "delete" | "update",
  changes: number,
): MutationOutcome {
  const changed = changes > 0;
  return {
    ...(changed
      ? {
          change: {
            collection: intent.collection,
            id: intent.id,
            operation,
          },
        }
      : {}),
    value: changed,
  };
}

function assertResultKind<Kind extends StorageCommandResult["kind"]>(
  result: StorageCommandResult,
  kind: Kind,
): asserts result is Extract<StorageCommandResult, { kind: Kind }> {
  if (result.kind !== kind) {
    throw new TypeError(`Storage returned a ${result.kind} result for a ${kind} command.`);
  }
}

function encodeEntity(entity: unknown): string {
  try {
    if (!isJsonCompatible(entity)) throw new Error();
    const encoded = JSON.stringify(entity);
    if (encoded === undefined) throw new Error();
    return encoded;
  } catch (cause) {
    throw new TypeError("Database entities must be JSON-serializable.", { cause });
  }
}

function createJsonSetPatch(entries: readonly (readonly [string, unknown])[]): Readonly<{
  bindings: readonly SqliteBinding[];
  expression: string;
}> {
  return {
    bindings: entries.flatMap(([key, value]) => [key, encodeEntity(value)]),
    expression: `json_set(
      entity,
      ${entries.map(() => "'$.' || json_quote(?), json(?)").join(",\n")}
    )`,
  };
}

function isJsonCompatible(value: unknown, ancestors = new Set<object>()): boolean {
  if (value === null || typeof value === "boolean" || typeof value === "string") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value !== "object") return false;

  const isArray = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (!isArray && prototype !== Object.prototype && prototype !== null) return false;
  if (ancestors.has(value)) return false;

  ancestors.add(value);
  const children = isArray ? Array.from(value) : Object.values(value);
  const compatible = children.every((child) => isJsonCompatible(child, ancestors));
  ancestors.delete(value);
  return compatible;
}
