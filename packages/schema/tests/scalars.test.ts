import { describe, expect, expectTypeOf, it } from "vite-plus/test";

import type { InferInput, InferOutput } from "../src/schema.ts";
import { boolean, number, string } from "../src/scalars.ts";

describe("string", () => {
  it("accepts strings and rejects non-strings", () => {
    const schema = string();

    expect(schema.validate("task")).toEqual({ value: "task" });
    expect(schema.validate(42)).toEqual({ issues: [{ message: "Expected a string." }] });
  });

  it("narrows to a literal union via values", () => {
    const statusSchema = string({ values: ["do", "doing", "done"] });

    expect(statusSchema.validate("doing")).toEqual({ value: "doing" });
    expect(statusSchema.validate("nope")).toEqual({
      issues: [{ message: 'Expected one of: "do", "doing", "done".' }],
    });
    expectTypeOf<InferOutput<typeof statusSchema>>().toEqualTypeOf<"do" | "doing" | "done">();
  });

  it("enforces inclusive minimum and maximum lengths", () => {
    const schema = string({ minLength: 2, maxLength: 4 });

    expect(schema.validate("ab")).toEqual({ value: "ab" });
    expect(schema.validate("abcd")).toEqual({ value: "abcd" });
    expect(schema.validate("a")).toEqual({
      issues: [{ message: "Expected length at least 2." }],
    });
    expect(schema.validate("abcde")).toEqual({
      issues: [{ message: "Expected length at most 4." }],
    });
  });

  it("rejects invalid length bounds", () => {
    expect(() => string({ minLength: -1 })).toThrow("Invalid bounds.");
    expect(() => string({ maxLength: 1.5 })).toThrow("Invalid bounds.");
    expect(() => string({ maxLength: Number.MAX_SAFE_INTEGER + 1 })).toThrow("Invalid bounds.");
    expect(() => string({ minLength: 2, maxLength: 1 })).toThrow("Invalid bounds.");
  });

  it("requires strings to match a pattern", () => {
    const schema = string({ pattern: /^[a-z]+$/ });

    expect(schema.validate("task")).toEqual({ value: "task" });
    expect(schema.validate("task-1")).toEqual({
      issues: [{ message: "Expected to match pattern." }],
    });
  });

  it("uses unanchored pattern matching", () => {
    const schema = string({ pattern: /ask/ });

    expect(schema.validate("task")).toEqual({ value: "task" });
  });

  it("applies stateful patterns consistently", () => {
    const schema = string({ pattern: /task/g });

    expect(schema.validate("task")).toEqual({ value: "task" });
    expect(schema.validate("task")).toEqual({ value: "task" });
  });

  it("rejects an invalid pattern option", () => {
    expect(() => string({ pattern: "task" } as never)).toThrow("Invalid pattern.");
  });

  it("requires an enumerated default to be an allowed value", () => {
    const createInvalidSchema = () => {
      // @ts-expect-error The default is not one of the allowed values.
      string({ values: ["do", "done"], default: "doing" });
    };

    expectTypeOf(createInvalidSchema).toBeFunction();
    expect(string({ values: ["do", "done"], default: "do" }).validate(undefined)).toEqual({
      value: "do",
    });
    expect(() => string({ values: ["do", "done"], default: "doing" } as never)).toThrow(
      'Invalid default. Expected one of: "do", "done".',
    );
  });
});

describe("number", () => {
  it("accepts finite numbers and rejects NaN/Infinity", () => {
    const schema = number();

    expect(schema.validate(3)).toEqual({ value: 3 });
    expect(schema.validate(3.5)).toEqual({ value: 3.5 });
    expect(schema.validate(Number.NaN)).toEqual({
      issues: [{ message: "Expected a finite number." }],
    });
    expect(schema.validate(Number.POSITIVE_INFINITY)).toEqual({
      issues: [{ message: "Expected a finite number." }],
    });
  });

  it("rejects non-finite defaults and allowed values", () => {
    expect(() => number({ default: Number.POSITIVE_INFINITY })).toThrow(
      "Invalid default. Expected a finite number.",
    );
    expect(() => number({ values: [Number.NaN] })).toThrow(
      "Invalid allowed value. Expected a finite number.",
    );
  });

  it("enforces inclusive minimum and maximum values", () => {
    const schema = number({ min: 1, max: 3 });

    expect(schema.validate(1)).toEqual({ value: 1 });
    expect(schema.validate(3)).toEqual({ value: 3 });
    expect(schema.validate(0)).toEqual({
      issues: [{ message: "Expected at least 1." }],
    });
    expect(schema.validate(4)).toEqual({
      issues: [{ message: "Expected at most 3." }],
    });
  });

  it("rejects invalid numeric bounds", () => {
    expect(() => number({ min: Number.NaN })).toThrow("Invalid bounds.");
    expect(() => number({ max: Number.POSITIVE_INFINITY })).toThrow("Invalid bounds.");
    expect(() => number({ min: 2, max: 1 })).toThrow("Invalid bounds.");
  });

  it("requires integers when integer is true", () => {
    const schema = number({ integer: true });

    expect(schema.validate(3)).toEqual({ value: 3 });
    expect(schema.validate(3.5)).toEqual({
      issues: [{ message: "Expected an integer." }],
    });
  });

  it("disables the integer restriction when integer is false", () => {
    const schema = number({ integer: false });

    expect(schema.validate(3)).toEqual({ value: 3 });
    expect(schema.validate(3.5)).toEqual({ value: 3.5 });
  });

  it("rejects an invalid integer option", () => {
    const createInvalidSchema = () => {
      // @ts-expect-error The integer option must be a boolean.
      number({ integer: "true" });
    };

    expectTypeOf(createInvalidSchema).toBeFunction();
    expect(() => number({ integer: "true" } as never)).toThrow("Invalid integer option.");
  });
});

describe("boolean", () => {
  it("accepts booleans and rejects non-booleans", () => {
    const schema = boolean();

    expect(schema.validate(true)).toEqual({ value: true });
    expect(schema.validate("true")).toEqual({ issues: [{ message: "Expected a boolean." }] });
  });

  it("does not support enumerated values", () => {
    // @ts-expect-error Boolean schemas do not support values.
    boolean({ values: [true] });
  });
});

describe("modifiers", () => {
  it("fills defaults for missing input", () => {
    expect(boolean({ default: false }).validate(undefined)).toEqual({ value: false });
    expect(number({ default: 0 }).validate(undefined)).toEqual({ value: 0 });
    expect(number({ default: 0 }).validate(5)).toEqual({ value: 5 });
  });

  it("captures options when the schema is created", () => {
    const options: { default?: number; nullable?: boolean } = { default: 1 };
    const numberSchema = number(options);

    options.default = 2;
    options.nullable = true;

    expect(numberSchema.validate(undefined)).toEqual({ value: 1 });
    expect(numberSchema.validate(null)).toEqual({
      issues: [{ message: "Expected a finite number." }],
    });
  });

  it("captures enumerated values when the schema is created", () => {
    const values = ["do", "done"];
    const statusSchema = string({ values });

    values.push("doing");

    expect(statusSchema.validate("doing")).toEqual({
      issues: [{ message: 'Expected one of: "do", "done".' }],
    });
  });

  it("captures scalar constraints when the schema is created", () => {
    const stringOptions = { minLength: 2 };
    const numberOptions = { max: 2 };
    const integerOptions = { integer: true };
    const stringSchema = string(stringOptions);
    const numberSchema = number(numberOptions);
    const integerSchema = number(integerOptions);

    stringOptions.minLength = 3;
    numberOptions.max = 1;
    integerOptions.integer = false;

    expect(stringSchema.validate("ab")).toEqual({ value: "ab" });
    expect(numberSchema.validate(2)).toEqual({ value: 2 });
    expect(integerSchema.validate(1.5)).toEqual({
      issues: [{ message: "Expected an integer." }],
    });
  });

  it("rejects defaults outside scalar bounds", () => {
    expect(() => number({ min: 2, default: 1 })).toThrow("Invalid default. Expected at least 2.");
    expect(() => string({ maxLength: 2, default: "long" })).toThrow(
      "Invalid default. Expected length at most 2.",
    );
  });

  it("rejects string defaults that do not match the pattern", () => {
    expect(() => string({ pattern: /^task$/, default: "note" })).toThrow(
      "Invalid default. Expected to match pattern.",
    );
    expect(string({ pattern: /^task$/, default: "task" }).validate(undefined)).toEqual({
      value: "task",
    });
  });

  it("applies the integer restriction to defaults", () => {
    expect(() => number({ integer: true, default: 1.5 })).toThrow(
      "Invalid default. Expected an integer.",
    );
    expect(number({ integer: true, default: 1 }).validate(undefined)).toEqual({ value: 1 });
    expect(number({ integer: false, default: 1 }).validate(undefined)).toEqual({ value: 1 });
    expect(number({ integer: false, default: 1.5 }).validate(undefined)).toEqual({ value: 1.5 });
  });

  it("permits null only when nullable", () => {
    expect(number({ nullable: true }).validate(null)).toEqual({ value: null });
    expect(number().validate(null)).toEqual({
      issues: [{ message: "Expected a finite number." }],
    });
  });

  it("requires nullable for a null default", () => {
    const createInvalidSchema = () => {
      // @ts-expect-error A null default requires nullable: true.
      number({ default: null });
    };

    expectTypeOf(createInvalidSchema).toBeFunction();
    expect(() => number({ default: null } as never)).toThrow(
      "Invalid default. Expected a finite number.",
    );
    expect(number({ nullable: true, default: null }).validate(undefined)).toEqual({ value: null });
  });

  it("includes null when nullable is a widened boolean", () => {
    const createNumberSchema = (nullable: boolean) => number({ nullable });
    const nullableNumberSchema = createNumberSchema(true);

    expectTypeOf<InferOutput<typeof nullableNumberSchema>>().toEqualTypeOf<number | null>();
    expect(nullableNumberSchema.validate(null)).toEqual({ value: null });
  });

  it("rejects an invalid nullable option", () => {
    const createInvalidSchema = () => {
      // @ts-expect-error The nullable option must be a boolean.
      string({ nullable: "true" });
    };

    expectTypeOf(createInvalidSchema).toBeFunction();
    expect(() => string({ nullable: "true" } as never)).toThrow("Invalid nullable option.");
    expect(() => number({ nullable: "true" } as never)).toThrow("Invalid nullable option.");
    expect(() => boolean({ nullable: "true" } as never)).toThrow("Invalid nullable option.");
  });

  it("rejects an invalid values option", () => {
    const createInvalidSchema = () => {
      // @ts-expect-error The values option must be an array.
      string({ values: "do" });
    };

    expectTypeOf(createInvalidSchema).toBeFunction();
    expect(() => string({ values: "do" } as never)).toThrow("Invalid values option.");
    expect(() => number({ values: 1 } as never)).toThrow("Invalid values option.");
  });

  it("infers input and output types", () => {
    const plainStringSchema = string();
    expectTypeOf<InferOutput<typeof plainStringSchema>>().toEqualTypeOf<string>();
    expectTypeOf<InferInput<typeof plainStringSchema>>().toEqualTypeOf<string>();

    const effortSchema = number({ nullable: true, default: null });
    expectTypeOf<InferOutput<typeof effortSchema>>().toEqualTypeOf<number | null>();
    expectTypeOf<InferInput<typeof effortSchema>>().toEqualTypeOf<number | null | undefined>();

    const doneSchema = boolean({ default: false });
    expectTypeOf<InferOutput<typeof doneSchema>>().toEqualTypeOf<boolean>();
    expectTypeOf<InferInput<typeof doneSchema>>().toEqualTypeOf<boolean | undefined>();
  });
});
