export function assertNonemptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`A sync ${label} must be a nonempty string.`);
  }
}
