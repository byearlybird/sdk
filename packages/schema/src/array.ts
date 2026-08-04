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

interface ArrayOptions<Item> extends SchemaOptions<readonly Item[]> {
  /** Reject duplicate validated items when true. */
  readonly uniqueItems?: boolean;
}

type ArrayOutput<ItemSchema extends Schema<unknown, unknown>, Options> = NullableValue<
  InferOutput<ItemSchema>[],
  Options
>;

type ArrayInput<ItemSchema extends Schema<unknown, unknown>, Options> = DefaultableInput<
  NullableValue<InferInput<ItemSchema>[], Options>,
  Options
>;

/** An array schema whose items are validated by `itemSchema`. */
export function array<
  ItemSchema extends Schema<unknown, unknown>,
  const Options extends ArrayOptions<InferInput<ItemSchema>> = {},
>(
  itemSchema: ItemSchema,
  options?: Options & NullDefaultConstraint<Options>,
): Schema<ArrayInput<ItemSchema, Options>, ArrayOutput<ItemSchema, Options>> {
  const itemSchemaProps = itemSchema["~standard"];
  const uniqueItems = options?.uniqueItems;
  if (uniqueItems !== undefined && typeof uniqueItems !== "boolean") {
    throw new TypeError("Invalid uniqueItems option.");
  }

  return defineSchema<ArrayInput<ItemSchema, Options>, ArrayOutput<ItemSchema, Options>>(
    (value) => {
      if (!Array.isArray(value)) return createFailure("Expected an array.");

      const validatedItems: unknown[] = [];
      const validationIssues: StandardSchemaV1.Issue[] = [];
      const serializedItems = uniqueItems ? new Set<unknown>() : undefined;

      for (let index = 0; index < value.length; index++) {
        const itemResult = itemSchemaProps.validate(value[index]);
        if (itemResult.issues) {
          for (const itemIssue of itemResult.issues) {
            validationIssues.push({
              message: itemIssue.message,
              path: [index, ...(itemIssue.path ?? [])],
            });
          }
        } else {
          const validatedItem = itemResult.value;
          validatedItems[index] = validatedItem;
          if (serializedItems) {
            const serializedItem = JSON.stringify(validatedItem);
            if (serializedItems.has(serializedItem)) {
              validationIssues.push({ message: "Expected unique items.", path: [index] });
            } else {
              serializedItems.add(serializedItem);
            }
          }
        }
      }

      if (validationIssues.length) return { issues: validationIssues };
      return { value: validatedItems };
    },
    options,
  );
}
