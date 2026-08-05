export function encodeEntity(entity: unknown): string {
  try {
    if (!isJsonCompatible(entity)) throw new Error();
    const encoded = JSON.stringify(entity);
    if (encoded === undefined) throw new Error();
    return encoded;
  } catch (cause) {
    throw new TypeError("Database entities must be JSON-serializable.", { cause });
  }
}

export function equalJson(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => equalJson(value, right[index]))
    );
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(rightRecord, key) &&
        equalJson(leftRecord[key], rightRecord[key]),
    )
  );
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
