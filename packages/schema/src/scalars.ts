import type { Schema } from "./schema.ts";
import {
  assertBooleanOption,
  createFailure,
  type DefaultableInput,
  defineSchema,
  type NullDefaultConstraint,
  type NullableValue,
  type OptionValue,
  type SchemaOptions,
} from "./internal.ts";

type ScalarValue = string | number | boolean;

interface EnumeratedScalarOptions<Value extends ScalarValue> extends SchemaOptions<Value> {
  /** Restrict the value to a fixed set, narrowing the inferred type. */
  readonly values?: readonly Value[];
}

interface StringOptions extends EnumeratedScalarOptions<string> {
  /** Reject strings shorter than this length. */
  readonly minLength?: number;
  /** Reject strings longer than this length. */
  readonly maxLength?: number;
  /** Reject strings that do not match this regular expression. */
  readonly pattern?: RegExp;
}

interface NumberOptions extends EnumeratedScalarOptions<number> {
  /** Reject numbers less than this value. */
  readonly min?: number;
  /** Reject numbers greater than this value. */
  readonly max?: number;
  /** Restrict values to integers when true. */
  readonly integer?: boolean;
}

/** The base type once `values` narrowing is applied. */
type SelectedScalarValue<BaseValue extends ScalarValue, Options> = Options extends {
  values: readonly (infer AllowedValue extends BaseValue)[];
}
  ? AllowedValue
  : BaseValue;

type ScalarOutput<BaseValue extends ScalarValue, Options> = NullableValue<
  SelectedScalarValue<BaseValue, Options>,
  Options
>;

type ScalarInput<BaseValue extends ScalarValue, Options> = DefaultableInput<
  ScalarOutput<BaseValue, Options>,
  Options
>;

/** Rejects defaults outside an enumerated schema's allowed values. */
type EnumeratedDefaultConstraint<BaseValue extends ScalarValue, Options> =
  Exclude<OptionValue<Options, "default">, null | undefined> extends SelectedScalarValue<
    BaseValue,
    Options
  >
    ? unknown
    : never;

/**
 * Bounds applied to a scalar. `kind` says how the bounds themselves are
 * validated: `"length"` bounds must be nonnegative integers, `"value"` bounds
 * must be finite.
 */
type ScalarBounds = Readonly<{
  kind: "length" | "value";
  maximum?: number;
  minimum?: number;
}>;

type ScalarDefinition<Value extends ScalarValue> = Readonly<{
  allowedValues?: readonly Value[];
  bounds?: ScalarBounds;
  expectedTypeMessage: string;
  integer?: boolean;
  isExpectedType: (value: unknown) => value is Value;
  options: SchemaOptions<Value> | undefined;
  pattern?: RegExp;
}>;

function defineScalarSchema<Value extends ScalarValue, Input, Output>(
  definition: ScalarDefinition<Value>,
): Schema<Input, Output> {
  const { bounds, expectedTypeMessage, integer, isExpectedType, options, pattern } = definition;

  assertBooleanOption(integer, "integer");
  if (definition.allowedValues !== undefined && !Array.isArray(definition.allowedValues)) {
    throw new TypeError("Invalid values option.");
  }
  if (pattern !== undefined && !(pattern instanceof RegExp)) {
    throw new TypeError("Invalid pattern.");
  }
  assertBounds(bounds);

  // Copied so a caller mutating its own input cannot alter the schema afterwards.
  const allowedValues = definition.allowedValues && [...definition.allowedValues];
  // Copied so validation never advances a caller's own `lastIndex`.
  const patternCopy = pattern && new RegExp(pattern);

  if (allowedValues?.some((allowedValue) => !isExpectedType(allowedValue))) {
    throw new TypeError(`Invalid allowed value. ${expectedTypeMessage}`);
  }

  /** Returns why `value` is invalid, or `undefined` when it is acceptable. */
  const findIssueMessage = (value: unknown): string | undefined => {
    if (!isExpectedType(value)) return expectedTypeMessage;
    if (allowedValues !== undefined && !allowedValues.includes(value)) {
      return `Expected one of: ${formatAllowedValues(allowedValues)}.`;
    }
    if (integer === true && !Number.isInteger(value)) return "Expected an integer.";
    const boundMessage = getBoundMessage(value, bounds);
    if (boundMessage !== undefined) return boundMessage;
    if (patternCopy !== undefined && !matchesPattern(value, patternCopy)) {
      return "Expected to match pattern.";
    }
    return undefined;
  };

  // A default is substituted without revalidation, so it must hold on its own.
  if (options !== undefined && "default" in options && options.default !== null) {
    const message = findIssueMessage(options.default);
    if (message !== undefined) throw new TypeError(`Invalid default. ${message}`);
  }

  return defineSchema<Input, Output>((value) => {
    const message = findIssueMessage(value);
    return message === undefined ? { value } : createFailure(message);
  }, options);
}

function assertBounds(bounds: ScalarBounds | undefined): void {
  if (bounds === undefined) return;
  const { kind, maximum, minimum } = bounds;
  const isValidBound = (bound: number | undefined): boolean =>
    bound === undefined ||
    (kind === "length" ? Number.isSafeInteger(bound) && bound >= 0 : Number.isFinite(bound));

  if (
    !isValidBound(minimum) ||
    !isValidBound(maximum) ||
    (minimum !== undefined && maximum !== undefined && minimum > maximum)
  ) {
    throw new TypeError("Invalid bounds.");
  }
}

function matchesPattern(value: ScalarValue, pattern: RegExp): boolean {
  // Patterns constrain strings only; no other scalar can violate one.
  if (typeof value !== "string") return true;
  pattern.lastIndex = 0;
  return pattern.test(value);
}

function getBoundMessage(value: ScalarValue, bounds: ScalarBounds | undefined): string | undefined {
  if (bounds === undefined) return undefined;
  const { maximum, minimum } = bounds;
  const measuresLength = typeof value === "string";
  const size = measuresLength ? value.length : Number(value);
  const prefix = measuresLength ? "length " : "";

  if (minimum !== undefined && size < minimum) return `Expected ${prefix}at least ${minimum}.`;
  if (maximum !== undefined && size > maximum) return `Expected ${prefix}at most ${maximum}.`;
  return undefined;
}

function formatAllowedValues(allowedValues: readonly ScalarValue[]): string {
  return allowedValues.map((allowedValue) => JSON.stringify(allowedValue)).join(", ");
}

/** A string schema. */
export function string<const Options extends StringOptions = {}>(
  options?: Options & NullDefaultConstraint<Options> & EnumeratedDefaultConstraint<string, Options>,
): Schema<ScalarInput<string, Options>, ScalarOutput<string, Options>> {
  return defineScalarSchema<string, ScalarInput<string, Options>, ScalarOutput<string, Options>>({
    allowedValues: options?.values,
    bounds: { kind: "length", maximum: options?.maxLength, minimum: options?.minLength },
    expectedTypeMessage: "Expected a string.",
    isExpectedType: (value): value is string => typeof value === "string",
    options,
    pattern: options?.pattern,
  });
}

/** A finite number schema. Rejects `NaN` and `Infinity`. */
export function number<const Options extends NumberOptions = {}>(
  options?: Options & NullDefaultConstraint<Options> & EnumeratedDefaultConstraint<number, Options>,
): Schema<ScalarInput<number, Options>, ScalarOutput<number, Options>> {
  return defineScalarSchema<number, ScalarInput<number, Options>, ScalarOutput<number, Options>>({
    allowedValues: options?.values,
    bounds: { kind: "value", maximum: options?.max, minimum: options?.min },
    expectedTypeMessage: "Expected a finite number.",
    integer: options?.integer,
    isExpectedType: (value): value is number => typeof value === "number" && Number.isFinite(value),
    options,
  });
}

/** A boolean schema. */
export function boolean<const Options extends SchemaOptions<boolean> = {}>(
  options?: Options & NullDefaultConstraint<Options>,
): Schema<ScalarInput<boolean, Options>, ScalarOutput<boolean, Options>> {
  return defineScalarSchema<boolean, ScalarInput<boolean, Options>, ScalarOutput<boolean, Options>>(
    {
      expectedTypeMessage: "Expected a boolean.",
      isExpectedType: (value): value is boolean => typeof value === "boolean",
      options,
    },
  );
}
