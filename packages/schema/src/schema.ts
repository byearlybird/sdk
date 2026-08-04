import type { StandardSchemaV1 } from "@standard-schema/spec";

export type { StandardSchemaV1 } from "@standard-schema/spec";

declare const schemaBrand: unique symbol;

/**
 * A Schema by Early Bird schema: a synchronous {@link StandardSchemaV1} that
 * carries its inferred input and output types.
 */
export type Schema<Input, Output = Input> = {
  readonly [schemaBrand]: true;
  readonly validate: (value: unknown) => StandardSchemaV1.Result<Output>;
  readonly "~standard": Omit<StandardSchemaV1.Props<Input, Output>, "validate"> & {
    readonly validate: (
      value: unknown,
      options?: StandardSchemaV1.Options,
    ) => StandardSchemaV1.Result<Output>;
  };
};

/** Any Standard Schema. Useful as a generic constraint. */
export type AnySchema = StandardSchemaV1<unknown, unknown>;

/** Infers the input type a schema accepts. */
export type InferInput<SchemaDefinition extends AnySchema> =
  StandardSchemaV1.InferInput<SchemaDefinition>;

/** Infers the output type a schema produces. */
export type InferOutput<SchemaDefinition extends AnySchema> =
  StandardSchemaV1.InferOutput<SchemaDefinition>;
