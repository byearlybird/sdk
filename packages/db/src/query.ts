import type { SqliteBinding } from "./storage.ts";

export type QueryScalar = boolean | null | number | string;

type QueryArrayElement = Exclude<QueryScalar, null>;

declare const queryOrderBrand: unique symbol;
declare const queryPredicateBrand: unique symbol;

export type QueryPredicate = Readonly<
  (
    | {
        field: string;
        kind: "comparison";
        operator: "eq" | "gt" | "gte" | "lt" | "lte";
        value: QueryScalar;
      }
    | {
        field: string;
        kind: "membership";
        operator: "excludes" | "includes";
        value: QueryArrayElement;
      }
    | {
        field: string;
        kind: "set-membership";
        operator: "in" | "notIn";
        values: readonly QueryScalar[];
      }
    | {
        expressions: readonly QueryPredicate[];
        kind: "group";
        operator: "and" | "or";
      }
  ) & { readonly [queryPredicateBrand]: true }
>;

export type QueryOrder = Readonly<{
  direction: "asc" | "desc";
  field: string;
}> & { readonly [queryOrderBrand]: true };

export type QueryDefinition = Readonly<{
  limit?: number;
  offset?: number;
  orderBy?: readonly QueryOrder[];
  where?: QueryPredicate;
}>;

type QueryFields<Data> = Data extends readonly unknown[]
  ? object
  : Data extends object
    ? Omit<Data, "id">
    : object;

type QueryDocument<Data> = QueryFields<Data> & { readonly id: string };
type StringKey<Data> = keyof QueryDocument<Data> & string;

type EqualityKey<Data> = {
  [Key in StringKey<Data>]-?: Exclude<QueryDocument<Data>[Key], undefined> extends QueryScalar
    ? Key
    : never;
}[StringKey<Data>];

type OrderedKey<Data> = {
  [Key in StringKey<Data>]-?: [Exclude<QueryDocument<Data>[Key], null | undefined>] extends [never]
    ? never
    : Exclude<QueryDocument<Data>[Key], null | undefined> extends number | string
      ? Key
      : never;
}[StringKey<Data>];

type ScalarArrayKey<Data> = {
  [Key in StringKey<Data>]-?: [Exclude<QueryDocument<Data>[Key], null | undefined>] extends [never]
    ? never
    : Exclude<QueryDocument<Data>[Key], null | undefined> extends readonly QueryArrayElement[]
      ? Key
      : never;
}[StringKey<Data>];

type ScalarArrayElement<Data, Key extends StringKey<Data>> =
  Exclude<QueryDocument<Data>[Key], null | undefined> extends readonly (infer Element)[]
    ? Element
    : never;

export type QueryBuilder<Data> = Readonly<{
  and(first: QueryPredicate, second: QueryPredicate, ...rest: QueryPredicate[]): QueryPredicate;
  asc<Key extends OrderedKey<Data>>(field: Key): QueryOrder;
  desc<Key extends OrderedKey<Data>>(field: Key): QueryOrder;
  eq<Key extends EqualityKey<Data>>(
    field: Key,
    value: Exclude<QueryDocument<Data>[Key], undefined>,
  ): QueryPredicate;
  excludes<Key extends ScalarArrayKey<Data>>(
    field: Key,
    value: ScalarArrayElement<Data, Key>,
  ): QueryPredicate;
  gt<Key extends OrderedKey<Data>>(
    field: Key,
    value: Exclude<QueryDocument<Data>[Key], null | undefined>,
  ): QueryPredicate;
  gte<Key extends OrderedKey<Data>>(
    field: Key,
    value: Exclude<QueryDocument<Data>[Key], null | undefined>,
  ): QueryPredicate;
  includes<Key extends ScalarArrayKey<Data>>(
    field: Key,
    value: ScalarArrayElement<Data, Key>,
  ): QueryPredicate;
  in<Key extends EqualityKey<Data>>(
    field: Key,
    values: readonly Exclude<QueryDocument<Data>[Key], undefined>[],
  ): QueryPredicate;
  lt<Key extends OrderedKey<Data>>(
    field: Key,
    value: Exclude<QueryDocument<Data>[Key], null | undefined>,
  ): QueryPredicate;
  lte<Key extends OrderedKey<Data>>(
    field: Key,
    value: Exclude<QueryDocument<Data>[Key], null | undefined>,
  ): QueryPredicate;
  notIn<Key extends EqualityKey<Data>>(
    field: Key,
    values: readonly Exclude<QueryDocument<Data>[Key], undefined>[],
  ): QueryPredicate;
  or(first: QueryPredicate, second: QueryPredicate, ...rest: QueryPredicate[]): QueryPredicate;
}>;

type NormalizedQuery = Readonly<{
  limit?: number;
  offset: number;
  orderBy: readonly QueryOrder[];
  where?: QueryPredicate;
}>;

export type CompiledQuery = Readonly<{
  bindings: readonly SqliteBinding[];
  sql: string;
}>;

type RuntimeQueryBuilder = Readonly<{
  and(first: QueryPredicate, second: QueryPredicate, ...rest: QueryPredicate[]): QueryPredicate;
  asc(field: string): QueryOrder;
  desc(field: string): QueryOrder;
  eq(field: string, value: QueryScalar): QueryPredicate;
  excludes(field: string, value: QueryArrayElement): QueryPredicate;
  gt(field: string, value: number | string): QueryPredicate;
  gte(field: string, value: number | string): QueryPredicate;
  includes(field: string, value: QueryArrayElement): QueryPredicate;
  in(field: string, values: readonly QueryScalar[]): QueryPredicate;
  lt(field: string, value: number | string): QueryPredicate;
  lte(field: string, value: number | string): QueryPredicate;
  notIn(field: string, values: readonly QueryScalar[]): QueryPredicate;
  or(first: QueryPredicate, second: QueryPredicate, ...rest: QueryPredicate[]): QueryPredicate;
}>;

const queryBuilder: RuntimeQueryBuilder = Object.freeze({
  and: (first, second, ...rest) => createGroupPredicate("and", [first, second, ...rest]),
  asc: (field) => createQueryOrder(field, "asc"),
  desc: (field) => createQueryOrder(field, "desc"),
  eq: (field, value) => createComparisonPredicate(field, "eq", value),
  excludes: (field, value) => createMembershipPredicate(field, "excludes", value),
  gt: (field, value) => createComparisonPredicate(field, "gt", value),
  gte: (field, value) => createComparisonPredicate(field, "gte", value),
  includes: (field, value) => createMembershipPredicate(field, "includes", value),
  in: (field, values) => createSetMembershipPredicate(field, "in", values),
  lt: (field, value) => createComparisonPredicate(field, "lt", value),
  lte: (field, value) => createComparisonPredicate(field, "lte", value),
  notIn: (field, values) => createSetMembershipPredicate(field, "notIn", values),
  or: (first, second, ...rest) => createGroupPredicate("or", [first, second, ...rest]),
});

export function getQueryBuilder<Data>(): QueryBuilder<Data> {
  return queryBuilder as unknown as QueryBuilder<Data>;
}

export function compileQuery(collection: string, definition: QueryDefinition): CompiledQuery {
  const query = normalizeQuery(definition);
  const bindings: SqliteBinding[] = [collection];
  const predicates = ["collection = ?"];
  if (query.where !== undefined) predicates.push(compilePredicate(query.where, bindings));

  const orderBy = query.orderBy
    .map(
      ({ direction, field }) => `${compileScalarField(field, bindings)} ${direction.toUpperCase()}`,
    )
    .join(", ");
  let pagination = "";

  if (query.limit !== undefined) {
    pagination = " LIMIT ? OFFSET ?";
    bindings.push(query.limit, query.offset);
  } else if (query.offset !== 0) {
    pagination = " LIMIT -1 OFFSET ?";
    bindings.push(query.offset);
  }

  return {
    bindings,
    sql: `
      SELECT entity_id, entity
      FROM entities
      WHERE ${predicates.join(" AND ")}
      ORDER BY ${orderBy}${pagination}
    `,
  };
}

function createComparisonPredicate(
  field: string,
  operator: Extract<QueryPredicate, { kind: "comparison" }>["operator"],
  value: QueryScalar,
): QueryPredicate {
  return Object.freeze({ field, kind: "comparison", operator, value }) as QueryPredicate;
}

function createGroupPredicate(
  operator: Extract<QueryPredicate, { kind: "group" }>["operator"],
  expressions: readonly QueryPredicate[],
): QueryPredicate {
  return Object.freeze({
    expressions: Object.freeze([...expressions]),
    kind: "group",
    operator,
  }) as QueryPredicate;
}

function createMembershipPredicate(
  field: string,
  operator: Extract<QueryPredicate, { kind: "membership" }>["operator"],
  value: QueryArrayElement,
): QueryPredicate {
  return Object.freeze({ field, kind: "membership", operator, value }) as QueryPredicate;
}

function createQueryOrder(field: string, direction: QueryOrder["direction"]): QueryOrder {
  return Object.freeze({ direction, field }) as QueryOrder;
}

function createSetMembershipPredicate(
  field: string,
  operator: Extract<QueryPredicate, { kind: "set-membership" }>["operator"],
  values: readonly QueryScalar[],
): QueryPredicate {
  return Object.freeze({
    field,
    kind: "set-membership",
    operator,
    values,
  }) as QueryPredicate;
}

function normalizeQuery(definition: QueryDefinition): NormalizedQuery {
  if (!isObject(definition)) throw new TypeError("A query must return an options object.");

  const limit = normalizeCount(definition.limit, "limit");
  const offset = normalizeCount(definition.offset, "offset", 0);
  const orderBy = normalizeOrder(definition.orderBy);
  const where =
    definition.where === undefined ? undefined : normalizePredicate(definition.where, new Set());

  return Object.freeze({
    ...(limit === undefined ? {} : { limit }),
    offset,
    orderBy,
    ...(where === undefined ? {} : { where }),
  });
}

function normalizePredicate(predicate: QueryPredicate, ancestors: Set<object>): QueryPredicate {
  if (!isObject(predicate)) {
    throw new TypeError("Query predicates must be created with the builder.");
  }
  if (ancestors.has(predicate)) throw new TypeError("Query predicates cannot contain cycles.");
  ancestors.add(predicate);

  try {
    if (predicate.kind === "comparison") {
      if (!isComparisonOperator(predicate.operator)) {
        throw new TypeError("Unknown query comparison operator.");
      }
      validateField(predicate.field);
      validateScalar(predicate.value);
      if (
        predicate.operator !== "eq" &&
        typeof predicate.value !== "number" &&
        typeof predicate.value !== "string"
      ) {
        throw new TypeError(`Query operator "${predicate.operator}" requires a string or number.`);
      }
      return createComparisonPredicate(predicate.field, predicate.operator, predicate.value);
    }

    if (predicate.kind === "membership") {
      if (predicate.operator !== "includes" && predicate.operator !== "excludes") {
        throw new TypeError("Unknown query membership operator.");
      }
      validateField(predicate.field);
      if (predicate.field === "id") throw new TypeError("Array queries require array fields.");
      validateArrayElement(predicate.value);
      return createMembershipPredicate(predicate.field, predicate.operator, predicate.value);
    }

    if (predicate.kind === "set-membership") {
      if (predicate.operator !== "in" && predicate.operator !== "notIn") {
        throw new TypeError("Unknown query set-membership operator.");
      }
      validateField(predicate.field);
      if (!Array.isArray(predicate.values)) {
        throw new TypeError(`Query operator "${predicate.operator}" requires an array.`);
      }
      const values = Object.freeze([...predicate.values]);
      values.forEach(validateScalar);
      return createSetMembershipPredicate(predicate.field, predicate.operator, values);
    }

    if (predicate.kind === "group") {
      if (predicate.operator !== "and" && predicate.operator !== "or") {
        throw new TypeError("Unknown query group operator.");
      }
      if (!Array.isArray(predicate.expressions) || predicate.expressions.length < 2) {
        throw new TypeError(
          `Query operator "${predicate.operator}" requires at least two predicates.`,
        );
      }
      return createGroupPredicate(
        predicate.operator,
        [...predicate.expressions].map((expression) => normalizePredicate(expression, ancestors)),
      );
    }

    throw new TypeError("Unknown query predicate kind.");
  } finally {
    ancestors.delete(predicate);
  }
}

function normalizeOrder(input: readonly QueryOrder[] | undefined): readonly QueryOrder[] {
  if (input !== undefined && !Array.isArray(input)) {
    throw new TypeError("Query orderBy must be an array.");
  }
  const orders = input === undefined ? [] : [...input];

  const normalized = orders.map((order) => {
    if (!isObject(order) || (order.direction !== "asc" && order.direction !== "desc")) {
      throw new TypeError("Query ordering must be created with the builder.");
    }
    validateField(order.field);
    return createQueryOrder(order.field, order.direction);
  });

  if (!normalized.some(({ field }) => field === "id")) {
    normalized.push(createQueryOrder("id", "asc"));
  }
  return Object.freeze(normalized);
}

function normalizeCount(value: number | undefined, name: "offset", fallback: number): number;
function normalizeCount(value: number | undefined, name: "limit"): number | undefined;
function normalizeCount(
  value: number | undefined,
  name: "limit" | "offset",
  fallback?: number,
): number | undefined {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`Query ${name} must be a nonnegative safe integer.`);
  }
  return value;
}

function compilePredicate(predicate: QueryPredicate, bindings: SqliteBinding[]): string {
  if (predicate.kind === "group") {
    const expressions = predicate.expressions.map((expression) =>
      compilePredicate(expression, bindings),
    );
    return `(${expressions.join(predicate.operator === "and" ? " AND " : " OR ")})`;
  }

  if (predicate.kind === "set-membership") return compileSetMembership(predicate, bindings);
  if (predicate.kind === "membership") return compileMembership(predicate, bindings);
  return compileComparison(predicate, bindings);
}

function compileComparison(
  predicate: Extract<QueryPredicate, { kind: "comparison" }>,
  bindings: SqliteBinding[],
): string {
  const selector = compileScalarField(predicate.field, bindings);
  if (predicate.operator === "eq" && predicate.value === null) return `${selector} IS NULL`;

  bindings.push(toSqliteBinding(predicate.value));
  return `${selector} ${comparisonSql(predicate.operator)} ?`;
}

function compileSetMembership(
  predicate: Extract<QueryPredicate, { kind: "set-membership" }>,
  bindings: SqliteBinding[],
): string {
  if (predicate.values.length === 0) return predicate.operator === "in" ? "FALSE" : "TRUE";

  const clauses: string[] = [];
  const nonNullValues = predicate.values.filter((value) => value !== null);
  if (nonNullValues.length > 0) {
    const selector = compileScalarField(predicate.field, bindings);
    const placeholders = nonNullValues.map((value) => {
      bindings.push(toSqliteBinding(value));
      return "?";
    });
    clauses.push(`COALESCE(${selector} IN (${placeholders.join(", ")}), FALSE)`);
  }
  if (predicate.values.includes(null)) {
    clauses.push(`${compileScalarField(predicate.field, bindings)} IS NULL`);
  }

  const included = clauses.length === 1 ? clauses[0]! : `(${clauses.join(" OR ")})`;
  return predicate.operator === "in" ? included : `NOT (${included})`;
}

function compileMembership(
  predicate: Extract<QueryPredicate, { kind: "membership" }>,
  bindings: SqliteBinding[],
): string {
  const selector = compileJsonField(predicate.field, bindings);
  const valueEquality = compileJsonValueEquality("member", predicate.value, bindings);
  const condition = `typeof(member.key) = 'integer' AND ${valueEquality}`;
  const exists = `EXISTS (SELECT 1 FROM json_each(${selector}) AS member WHERE ${condition})`;
  return predicate.operator === "includes" ? exists : `NOT ${exists}`;
}

function compileJsonValueEquality(
  alias: string,
  value: QueryArrayElement,
  bindings: SqliteBinding[],
): string {
  if (typeof value === "boolean") return `${alias}.type = '${value ? "true" : "false"}'`;

  bindings.push(value);
  const typeCondition =
    typeof value === "number" ? `${alias}.type IN ('integer', 'real')` : `${alias}.type = 'text'`;
  return `${typeCondition} AND ${alias}.value = ?`;
}

function compileScalarField(field: string, bindings: SqliteBinding[]): string {
  if (field === "id") return "entities.entity_id";
  return compileDocumentField(field, bindings);
}

function compileJsonField(field: string, bindings: SqliteBinding[]): string {
  if (field === "id") throw new TypeError("Array queries require array fields.");
  return compileDocumentField(field, bindings);
}

function compileDocumentField(field: string, bindings: SqliteBinding[]): string {
  bindings.push(field);
  return "json_extract(entities.entity, '$.' || json_quote(?))";
}

function comparisonSql(operator: "eq" | "gt" | "gte" | "lt" | "lte"): string {
  switch (operator) {
    case "eq":
      return "=";
    case "gt":
      return ">";
    case "gte":
      return ">=";
    case "lt":
      return "<";
    case "lte":
      return "<=";
  }
}

function toSqliteBinding(value: QueryScalar): SqliteBinding {
  return typeof value === "boolean" ? Number(value) : value;
}

function validateArrayElement(value: unknown): asserts value is QueryArrayElement {
  validateScalar(value);
  if (value === null) {
    throw new TypeError("Array membership values must be strings, numbers, or Booleans.");
  }
}

function validateField(field: unknown): asserts field is string {
  if (typeof field !== "string" || field.length === 0) {
    throw new TypeError("Query fields must be nonempty strings.");
  }
}

function validateScalar(value: unknown): asserts value is QueryScalar {
  if (
    value !== null &&
    typeof value !== "boolean" &&
    typeof value !== "number" &&
    typeof value !== "string"
  ) {
    throw new TypeError("Query comparison values must be scalar JSON values.");
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("Query comparison numbers must be finite.");
  }
}

function isComparisonOperator(
  value: unknown,
): value is Extract<QueryPredicate, { kind: "comparison" }>["operator"] {
  return value === "eq" || value === "gt" || value === "gte" || value === "lt" || value === "lte";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
