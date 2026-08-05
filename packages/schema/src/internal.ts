import type { StandardSchemaV1 } from "@standard-schema/spec";

import type { Schema } from "./schema.ts";

/** The vendor identifier reported by every Schema by Early Bird schema. */
const SCHEMA_VENDOR = "@byearlybird/schema";

/** Builds a single-issue failure result. */
export function createFailure(validationMessage: string): StandardSchemaV1.FailureResult {
  return { issues: [{ message: validationMessage }] };
}

/**
 * Rejects a boolean option whose runtime value contradicts its declared type.
 * Types alone do not protect callers consuming this package from JavaScript.
 */
export function assertBooleanOption(value: unknown, optionName: string): void {
  if (value !== undefined && typeof value !== "boolean") {
    throw new TypeError(`Invalid ${optionName} option.`);
  }
}

/**
 * Wraps a type-specific validator with shared `default` and `nullable`
 * handling and packages it as a {@link Schema}.
 */
export function defineSchema<Input, Output>(
  validateResolvedValue: (value: unknown) => StandardSchemaV1.Result<unknown>,
  options: SchemaOptions<unknown> | undefined,
): Schema<Input, Output> {
  assertBooleanOption(options?.nullable, "nullable");
  const hasDefault = options !== undefined && "default" in options;
  const defaultValue = options?.default;
  const nullable = options?.nullable === true;

  const validate = (value: unknown): StandardSchemaV1.Result<unknown> => {
    const resolvedValue = value === undefined && hasDefault ? defaultValue : value;
    if (resolvedValue === null && nullable) {
      return { value: null };
    }
    return validateResolvedValue(resolvedValue);
  };

  const standardSchemaProps = {
    version: 1,
    vendor: SCHEMA_VENDOR,
    validate,
  } satisfies StandardSchemaV1.Props;

  return { "~standard": standardSchemaProps, validate } as Schema<Input, Output>;
}

/** Options shared by schemas that support nullable values and defaults. */
export interface SchemaOptions<Value> {
  /** Allow `null` in addition to the base value. */
  readonly nullable?: boolean;
  /** Value substituted when the input is `undefined`. Makes the input optional. */
  readonly default?: Value | null;
}

export type OptionValue<Options, Key extends PropertyKey> = Key extends keyof Options
  ? Options[Key]
  : never;

/** Rejects a possibly null default unless the schema is explicitly nullable. */
export type NullDefaultConstraint<Options> =
  null extends OptionValue<Options, "default">
    ? Options extends { nullable: true }
      ? unknown
      : never
    : unknown;

/** Adds `| null` to a value when the schema options set `nullable: true`. */
export type NullableValue<Value, Options> =
  true extends OptionValue<Options, "nullable"> ? Value | null : Value;

/** Adds `| undefined` to an input when the schema options provide a default. */
export type DefaultableInput<Value, Options> = "default" extends keyof Options
  ? Value | undefined
  : Value;
