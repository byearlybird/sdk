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
  const nullable = options?.nullable === true;

  const resolve = (value: unknown): StandardSchemaV1.Result<unknown> => {
    if (value === null && nullable) return { value: null };
    return validateResolvedValue(value);
  };

  const defaultOption = options?.default;
  const defaultFactory = typeof defaultOption === "function" ? defaultOption : undefined;
  const defaultValue =
    hasDefault && defaultFactory === undefined
      ? snapshotDefault(defaultOption, resolve)
      : undefined;

  const validate = (value: unknown): StandardSchemaV1.Result<unknown> =>
    resolve(
      value === undefined && hasDefault
        ? defaultFactory
          ? defaultFactory()
          : defaultValue
        : value,
    );

  const standardSchemaProps = {
    version: 1,
    vendor: SCHEMA_VENDOR,
    validate,
  } satisfies StandardSchemaV1.Props;

  return { "~standard": standardSchemaProps, validate } as Schema<Input, Output>;
}

/**
 * Validates a default when the schema is built, so an unusable one fails there
 * instead of at some later validation, and returns the validated copy. Object
 * and array validators rebuild their values, so that copy no longer aliases
 * whatever the caller passed in and cannot be changed by mutating it.
 */
function snapshotDefault(
  defaultValue: unknown,
  resolve: (value: unknown) => StandardSchemaV1.Result<unknown>,
): unknown {
  if (defaultValue === undefined) {
    throw new TypeError("Invalid default. Expected a defined value.");
  }

  const result = resolve(defaultValue);
  if (result.issues) {
    const [issue] = result.issues;
    throw new TypeError(
      `Invalid default. ${issue === undefined ? "" : describeIssue(issue)}`.trim(),
    );
  }
  return result.value;
}

/** Appends the failing location to an issue message when the issue has a path. */
function describeIssue(issue: StandardSchemaV1.Issue): string {
  const { message, path } = issue;
  if (path === undefined || path.length === 0) return message;

  const location = path
    .map((segment) => String(typeof segment === "object" ? segment.key : segment))
    .join(".");
  return `${message} (at ${location})`;
}

/** Options shared by schemas that support nullable values and defaults. */
export interface SchemaOptions<Value> {
  /** Allow `null` in addition to the base value. */
  readonly nullable?: boolean;
  /**
   * Value substituted when the input is `undefined`. Makes the input optional.
   * Either a fixed value or a synchronous function called each time a default
   * is needed. Either way, the result must be a value the schema accepts;
   * `undefined` itself is not a default.
   */
  readonly default?: Value | null | (() => Value | null);
}

export type OptionValue<Options, Key extends PropertyKey> = Key extends keyof Options
  ? Options[Key]
  : never;

/** Unwraps a default option that may be a fixed value or a synchronous factory. */
export type ResolvedDefault<Options> =
  OptionValue<Options, "default"> extends never
    ? never
    : OptionValue<Options, "default"> extends () => infer Value
      ? Value
      : OptionValue<Options, "default">;

/** Rejects a possibly null default unless the schema is explicitly nullable. */
export type NullDefaultConstraint<Options> =
  null extends ResolvedDefault<Options>
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
