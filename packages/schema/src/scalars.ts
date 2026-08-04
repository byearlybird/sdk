import type { Schema } from "./schema.ts";
import {
  createFailure,
  type DefaultableInput,
  defineSchema,
  type NullDefaultConstraint,
  type NullableValue,
  type OptionValue,
  type SchemaOptions,
} from "./internal.ts";

type ScalarValue = string | number | boolean;
type LengthPrefix = "" | "length ";

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

function defineScalarSchema<Value extends ScalarValue, Input, Output>(
  expectedTypeMessage: string,
  isExpectedType: (value: unknown) => value is Value,
  options: SchemaOptions<Value> | undefined,
  allowedValues?: readonly Value[],
  minimum?: number,
  maximum?: number,
  integer?: boolean,
  // The prefix also identifies string-length bounds without another runtime argument.
  lengthPrefix: LengthPrefix = "",
  pattern?: RegExp,
): Schema<Input, Output> {
  const allowedValuesSnapshot = allowedValues === undefined ? undefined : [...allowedValues];
  if (pattern !== undefined && !(pattern instanceof RegExp)) {
    throw new TypeError("Invalid pattern.");
  }
  if (integer !== undefined && typeof integer !== "boolean") {
    throw new TypeError("Invalid integer option.");
  }
  const patternSnapshot = pattern && new RegExp(pattern);

  if (allowedValuesSnapshot?.some((allowedValue) => !isExpectedType(allowedValue))) {
    throw new TypeError(`Invalid allowed value. ${expectedTypeMessage}`);
  }

  if (
    [minimum, maximum].some(
      (bound) =>
        bound !== undefined &&
        (lengthPrefix ? !Number.isSafeInteger(bound) || bound < 0 : !Number.isFinite(bound)),
    ) ||
    (minimum !== undefined && maximum !== undefined && minimum > maximum)
  ) {
    throw new TypeError("Invalid bounds.");
  }

  if (options !== undefined && "default" in options && options.default !== null) {
    const defaultValue = options.default;
    if (!isExpectedType(defaultValue)) {
      throw new TypeError(`Invalid default. ${expectedTypeMessage}`);
    }
    if (allowedValuesSnapshot && !allowedValuesSnapshot.includes(defaultValue)) {
      throw new TypeError(`Default must be one of: ${formatAllowedValues(allowedValuesSnapshot)}.`);
    }
    const integerMessage = getIntegerMessage(defaultValue, integer);
    if (integerMessage) throw new TypeError(`Invalid default. ${integerMessage}`);
    const boundMessage = getBoundMessage(defaultValue, minimum, maximum, lengthPrefix);
    if (boundMessage) throw new TypeError(`Invalid default. ${boundMessage}`);
    if (patternSnapshot && !matchesPattern(defaultValue as string, patternSnapshot)) {
      throw new TypeError("Invalid default. Expected to match pattern.");
    }
  }

  return defineSchema<Input, Output>((value) => {
    if (!isExpectedType(value)) return createFailure(expectedTypeMessage);
    if (allowedValuesSnapshot && !allowedValuesSnapshot.includes(value)) {
      return createFailure(`Expected one of: ${formatAllowedValues(allowedValuesSnapshot)}.`);
    }
    const integerMessage = getIntegerMessage(value, integer);
    if (integerMessage) return createFailure(integerMessage);
    const boundMessage = getBoundMessage(value, minimum, maximum, lengthPrefix);
    if (boundMessage) return createFailure(boundMessage);
    if (patternSnapshot && !matchesPattern(value as string, patternSnapshot)) {
      return createFailure("Expected to match pattern.");
    }
    return { value };
  }, options);
}

function getIntegerMessage(value: ScalarValue, integer: boolean | undefined): string | undefined {
  if (integer && !Number.isInteger(value)) {
    return "Expected an integer.";
  }
}

function matchesPattern(value: string, pattern: RegExp): boolean {
  pattern.lastIndex = 0;
  return pattern.test(value);
}

function getBoundMessage(
  value: ScalarValue,
  minimum: number | undefined,
  maximum: number | undefined,
  lengthPrefix: LengthPrefix,
): string | undefined {
  const size = lengthPrefix ? (value as string).length : (value as number);
  if (minimum !== undefined && size < minimum) {
    return `Expected ${lengthPrefix}at least ${minimum}.`;
  }
  if (maximum !== undefined && size > maximum) {
    return `Expected ${lengthPrefix}at most ${maximum}.`;
  }
}

function formatAllowedValues(allowedValues: readonly ScalarValue[]): string {
  return allowedValues.map((allowedValue) => JSON.stringify(allowedValue)).join(", ");
}

/** A string schema. */
export function string<const Options extends StringOptions = {}>(
  options?: Options & NullDefaultConstraint<Options> & EnumeratedDefaultConstraint<string, Options>,
): Schema<ScalarInput<string, Options>, ScalarOutput<string, Options>> {
  return defineScalarSchema<string, ScalarInput<string, Options>, ScalarOutput<string, Options>>(
    "Expected a string.",
    (value): value is string => typeof value === "string",
    options,
    options?.values,
    options?.minLength,
    options?.maxLength,
    undefined,
    "length ",
    options?.pattern,
  );
}

/** A finite number schema. Rejects `NaN` and `Infinity`. */
export function number<const Options extends NumberOptions = {}>(
  options?: Options & NullDefaultConstraint<Options> & EnumeratedDefaultConstraint<number, Options>,
): Schema<ScalarInput<number, Options>, ScalarOutput<number, Options>> {
  return defineScalarSchema<number, ScalarInput<number, Options>, ScalarOutput<number, Options>>(
    "Expected a finite number.",
    (value): value is number => typeof value === "number" && Number.isFinite(value),
    options,
    options?.values,
    options?.min,
    options?.max,
    options?.integer,
  );
}

/** A boolean schema. */
export function boolean<const Options extends SchemaOptions<boolean> = {}>(
  options?: Options & NullDefaultConstraint<Options>,
): Schema<ScalarInput<boolean, Options>, ScalarOutput<boolean, Options>> {
  return defineScalarSchema<boolean, ScalarInput<boolean, Options>, ScalarOutput<boolean, Options>>(
    "Expected a boolean.",
    (value): value is boolean => typeof value === "boolean",
    options,
  );
}
