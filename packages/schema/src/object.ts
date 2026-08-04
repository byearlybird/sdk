import type { StandardSchemaV1 } from "@standard-schema/spec";

import type { InferInput, InferOutput, Schema } from "./schema.ts";
import {
  createFailure,
  type DefaultableInput,
  defineSchema,
  type NullDefaultConstraint,
  type NullableValue,
  type SchemaOptions,
} from "./internal.ts";

type SchemaFields = Record<string, Schema<unknown, unknown>>;

type ObjectOptions<ObjectShape> = SchemaOptions<ObjectShape>;

type SimplifyObject<ObjectType> = {
  [Key in keyof ObjectType]: ObjectType[Key];
} & {};

/** Rejects fields that cannot be represented as JSON object keys. */
type StringKeyConstraint<SchemaShape> =
  Extract<keyof SchemaShape, symbol> extends never ? unknown : never;

/** Keys whose input accepts `undefined` are optional on input. */
type OptionalInputKeys<SchemaShape extends SchemaFields> = {
  [FieldName in keyof SchemaShape]: undefined extends InferInput<SchemaShape[FieldName]>
    ? FieldName
    : never;
}[keyof SchemaShape];

type ObjectShapeInput<SchemaShape extends SchemaFields> = SimplifyObject<
  {
    [FieldName in Exclude<keyof SchemaShape, OptionalInputKeys<SchemaShape>>]: InferInput<
      SchemaShape[FieldName]
    >;
  } & {
    [FieldName in OptionalInputKeys<SchemaShape>]?: Exclude<
      InferInput<SchemaShape[FieldName]>,
      undefined
    >;
  }
>;

type ObjectShapeOutput<SchemaShape extends SchemaFields> = SimplifyObject<{
  [FieldName in keyof SchemaShape]: InferOutput<SchemaShape[FieldName]>;
}>;

type ObjectInput<SchemaShape extends SchemaFields, Options> = DefaultableInput<
  NullableValue<ObjectShapeInput<SchemaShape>, Options>,
  Options
>;

type ObjectOutput<SchemaShape extends SchemaFields, Options> = NullableValue<
  ObjectShapeOutput<SchemaShape>,
  Options
>;

/** An object schema. Unknown keys are rejected. */
export function object<
  SchemaShape extends SchemaFields,
  const Options extends ObjectOptions<ObjectShapeInput<SchemaShape>> = {},
>(
  fields: SchemaShape & StringKeyConstraint<SchemaShape>,
  options?: Options & NullDefaultConstraint<Options>,
): Schema<ObjectInput<SchemaShape, Options>, ObjectOutput<SchemaShape, Options>> {
  const fieldNames = Reflect.ownKeys(fields);
  if (fieldNames.some((fieldName) => typeof fieldName === "symbol")) {
    throw new TypeError("Object schema fields must use string keys.");
  }

  const fieldEntries = (fieldNames as string[]).map(
    (fieldName) => [fieldName, fields[fieldName]["~standard"]] as const,
  );

  return defineSchema<ObjectInput<SchemaShape, Options>, ObjectOutput<SchemaShape, Options>>(
    (value) => {
      if (!isPlainObject(value)) {
        return createFailure("Expected a plain object.");
      }

      const validatedEntries: [string, unknown][] = [];
      const validationIssues: StandardSchemaV1.Issue[] = [];

      for (const fieldName of Reflect.ownKeys(value)) {
        if (typeof fieldName !== "string" || !fieldNames.includes(fieldName)) {
          const formattedFieldName =
            typeof fieldName === "symbol" ? String(fieldName) : JSON.stringify(fieldName);
          validationIssues.push({
            message: `Unexpected key: ${formattedFieldName}.`,
            path: [fieldName],
          });
        }
      }

      for (const [fieldName, fieldSchemaProps] of fieldEntries) {
        const fieldResult = fieldSchemaProps.validate(value[fieldName]);
        if (fieldResult.issues) {
          for (const fieldIssue of fieldResult.issues) {
            validationIssues.push({
              message: fieldIssue.message,
              path: [fieldName, ...(fieldIssue.path ?? [])],
            });
          }
        } else {
          validatedEntries.push([fieldName, fieldResult.value]);
        }
      }

      if (validationIssues.length) return { issues: validationIssues };
      return { value: Object.fromEntries(validatedEntries) };
    },
    options,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}
