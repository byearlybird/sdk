import { describe, expect, expectTypeOf, it } from "vite-plus/test";

import type { StandardSchemaV1 } from "../src/schema.ts";
import { string } from "../src/scalars.ts";

describe("Standard Schema", () => {
  it("exposes the same validator through both APIs", () => {
    const schema = string();

    expect(schema.validate).toBe(schema["~standard"].validate);
  });

  it("returns a success result", () => {
    const result = string().validate("task");

    expect(result).toEqual({ value: "task" });
    expectTypeOf(result).toEqualTypeOf<StandardSchemaV1.Result<string>>();
  });

  it("returns a failure result with standard issues", () => {
    expect(string().validate(42)).toEqual({
      issues: [{ message: "Expected a string." }],
    });
  });

  it("advertises its Standard Schema metadata", () => {
    expect(string()["~standard"]).toMatchObject({
      version: 1,
      vendor: "@byearlybird/schema",
    });
  });
});
