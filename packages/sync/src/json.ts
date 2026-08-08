/** Encodes a value as JSON, rejecting anything that cannot round-trip unchanged. */
export function encodeJson(value: unknown, label: string): string {
  const message = `A ${label} must be JSON-serializable.`;
  let encoded: string | undefined;
  try {
    if (isJsonCompatible(value)) encoded = JSON.stringify(value);
  } catch (cause) {
    // Accessor properties can throw while being inspected or serialized.
    throw new TypeError(message, { cause });
  }
  if (encoded === undefined) throw new TypeError(message);
  return encoded;
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
