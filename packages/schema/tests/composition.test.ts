import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, expectTypeOf, it } from "vite-plus/test";

import { array } from "../src/array.ts";
import { object } from "../src/object.ts";
import type { InferInput, InferOutput } from "../src/schema.ts";
import { boolean, number, string } from "../src/scalars.ts";

const taskSchema = object({
  id: string(),
  status: string({ values: ["do", "doing", "done"] }),
  effort: number({ nullable: true, default: null }),
  done: boolean({ default: false }),
  tags: array(string(), { default: [] }),
  subtasks: array(object({ title: string(), done: boolean({ default: false }) })),
});

const uppercaseSchema: StandardSchemaV1<string, string> = {
  "~standard": {
    validate: (value) =>
      typeof value === "string"
        ? { value: value.toUpperCase() }
        : { issues: [{ message: "Expected a string." }] },
    vendor: "test",
    version: 1,
  },
};

describe("array", () => {
  it("validates every item and rejects non-arrays", () => {
    const schema = array(string());

    expect(schema.validate(["a", "b"])).toEqual({ value: ["a", "b"] });
    expect(schema.validate("nope")).toEqual({
      issues: [{ message: "Expected an array." }],
    });
  });

  it("accepts only Schema by Early Bird item schemas", () => {
    const composeExternalSchema = () => {
      // @ts-expect-error Composition accepts only Schema by Early Bird schemas.
      return array(uppercaseSchema);
    };

    expectTypeOf(composeExternalSchema).toBeFunction();
  });

  it("reports the failing index in the issue path", () => {
    const result = array(number()).validate([1, "two", 3]);

    expect(result.issues?.[0]?.path).toEqual([1]);
  });

  it("rejects duplicate items when uniqueItems is true", () => {
    const schema = array(number(), { uniqueItems: true });

    expect(schema.validate([1, 2, 3])).toEqual({ value: [1, 2, 3] });
    expect(schema.validate([1, 2, 1])).toEqual({
      issues: [{ message: "Expected unique items.", path: [2] }],
    });
    expect(array(number(), { uniqueItems: false }).validate([1, 1])).toEqual({
      value: [1, 1],
    });
  });

  it("compares unique items by validated JSON value", () => {
    const objectArraySchema = array(object({ id: number(), done: boolean() }), {
      uniqueItems: true,
    });

    expect(
      objectArraySchema.validate([
        { id: 1, done: false },
        { done: false, id: 1 },
      ]),
    ).toEqual({
      issues: [{ message: "Expected unique items.", path: [1] }],
    });
    expect(
      array(string({ default: "task" }), { uniqueItems: true }).validate([undefined, "task"]),
    ).toEqual({
      issues: [{ message: "Expected unique items.", path: [1] }],
    });
  });

  it("applies uniqueItems to array defaults", () => {
    const schema = array(number(), { uniqueItems: true, default: [1, 1] });

    expect(schema.validate(undefined)).toEqual({
      issues: [{ message: "Expected unique items.", path: [1] }],
    });
  });

  it("captures and validates the uniqueItems option", () => {
    const options = { uniqueItems: true };
    const schema = array(number(), options);
    options.uniqueItems = false;

    expect(schema.validate([1, 1])).toEqual({
      issues: [{ message: "Expected unique items.", path: [1] }],
    });

    const createInvalidSchema = () => {
      // @ts-expect-error The uniqueItems option must be a boolean.
      array(number(), { uniqueItems: "true" });
    };

    expectTypeOf(createInvalidSchema).toBeFunction();
    expect(() => array(number(), { uniqueItems: "true" } as never)).toThrow(
      "Invalid uniqueItems option.",
    );
  });

  it("requires nullable for a null default", () => {
    // @ts-expect-error A null default requires nullable: true.
    array(string(), { default: null });

    expect(array(string(), { nullable: true, default: null }).validate(undefined)).toEqual({
      value: null,
    });
  });
});

describe("object", () => {
  it("applies defaults and drops omitted optional input", () => {
    expect(taskSchema.validate({ id: "t1", status: "do", subtasks: [] })).toEqual({
      value: {
        id: "t1",
        status: "do",
        effort: null,
        done: false,
        tags: [],
        subtasks: [],
      },
    });
  });

  it("rejects unknown keys", () => {
    const result = taskSchema.validate({ id: "t1", status: "do", subtasks: [], oops: 1 });

    expect(result.issues?.[0]).toEqual({ message: 'Unexpected key: "oops".', path: ["oops"] });
  });

  it("rejects symbol input keys", () => {
    const unknownKey = Symbol("unknown");

    expect(object({}).validate({ [unknownKey]: true })).toEqual({
      issues: [{ message: "Unexpected key: Symbol(unknown).", path: [unknownKey] }],
    });
  });

  it("preserves fields named __proto__", () => {
    const schema = object({ ["__proto__"]: string() });
    const result = schema.validate({ ["__proto__"]: "value" });

    expect(result.issues).toBeUndefined();
    if (result.issues) throw new Error(result.issues[0]?.message);

    expect(Object.hasOwn(result.value, "__proto__")).toBe(true);
    expect(result.value).toEqual({ ["__proto__"]: "value" });
  });

  it("rejects symbol field names", () => {
    const symbolField = Symbol("field");
    const createInvalidSchema = () => {
      // @ts-expect-error JSON object schemas cannot use symbol keys.
      object({ [symbolField]: string() });
    };

    expectTypeOf(createInvalidSchema).toBeFunction();
    expect(() => object({ [symbolField]: string() } as never)).toThrow(
      "Object schema fields must use string keys.",
    );
  });

  it("supports non-enumerable schema fields", () => {
    const fields = {} as { title: ReturnType<typeof string> };
    Object.defineProperty(fields, "title", { value: string() });

    expect(object(fields).validate({ title: "task" })).toEqual({ value: { title: "task" } });
  });

  it("accepts only Schema by Early Bird field schemas", () => {
    const composeExternalSchema = () => {
      // @ts-expect-error Composition accepts only Schema by Early Bird schemas.
      return object({ title: uppercaseSchema });
    };

    expectTypeOf(composeExternalSchema).toBeFunction();
  });

  it("rejects non-plain object instances", () => {
    class Example {}

    const schema = object({});
    const expectedFailure = { issues: [{ message: "Expected a plain object." }] };

    expect(schema.validate(new Date())).toEqual(expectedFailure);
    expect(schema.validate(new Map())).toEqual(expectedFailure);
    expect(schema.validate(new Example())).toEqual(expectedFailure);
    expect(schema.validate(Object.create(null))).toEqual({ value: {} });
  });

  it("requires nullable for a null default", () => {
    // @ts-expect-error A null default requires nullable: true.
    object({}, { default: null });

    expect(object({}, { nullable: true, default: null }).validate(undefined)).toEqual({
      value: null,
    });
  });

  it("reports nested issue paths", () => {
    const result = taskSchema.validate({ id: "t1", status: "nope", subtasks: [] });

    expect(result.issues?.[0]?.path).toEqual(["status"]);
  });

  it("infers output types with defaults resolved", () => {
    expectTypeOf<InferOutput<typeof taskSchema>>().toEqualTypeOf<{
      id: string;
      status: "do" | "doing" | "done";
      effort: number | null;
      done: boolean;
      tags: string[];
      subtasks: { title: string; done: boolean }[];
    }>();
  });

  it("infers input types with defaulted keys optional", () => {
    expectTypeOf<InferInput<typeof taskSchema>>().toEqualTypeOf<{
      id: string;
      status: "do" | "doing" | "done";
      effort?: number | null;
      done?: boolean;
      tags?: string[];
      subtasks: { title: string; done?: boolean }[];
    }>();
  });
});
