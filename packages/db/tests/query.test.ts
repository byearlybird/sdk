import { describe, expect, it } from "vite-plus/test";
import { compileQuery, getQueryBuilder } from "../src/query.ts";
import type { QueryDefinition, QueryPredicate } from "../src/query.ts";

type Document = {
  active: boolean;
  effort: null | number;
  flags: boolean[];
  name: string;
  tags: string[];
};

const query = getQueryBuilder<Document>();

describe("query compiler", () => {
  it("orders every query deterministically by entity ID", () => {
    const compiled = compileQuery("habits", {});

    expect(compiled.sql).toContain("WHERE collection = ?");
    expect(compiled.sql).toContain("ORDER BY entities.entity_id ASC");
    expect(compiled.bindings).toEqual(["habits"]);
  });

  it("compiles grouped comparisons, ordering, and pagination", () => {
    const compiled = compileQuery("habits", {
      limit: 2,
      offset: 1,
      orderBy: [query.desc("effort")],
      where: query.and(
        query.eq("active", true),
        query.or(query.gt("effort", 2), query.lt("name", "Charlie")),
      ),
    });

    expect(compiled.sql).toContain(
      "(json_extract(entities.entity, '$.' || json_quote(?)) = ? AND (json_extract(entities.entity, '$.' || json_quote(?)) > ? OR json_extract(entities.entity, '$.' || json_quote(?)) < ?))",
    );
    expect(compiled.sql).toContain(
      "ORDER BY json_extract(entities.entity, '$.' || json_quote(?)) DESC, entities.entity_id ASC LIMIT ? OFFSET ?",
    );
    expect(compiled.bindings).toEqual([
      "habits",
      "active",
      1,
      "effort",
      2,
      "name",
      "Charlie",
      "effort",
      2,
      1,
    ]);
  });

  it("compiles inclusive ranges, null equality, and offset-only pagination", () => {
    const compiled = compileQuery("habits", {
      offset: 4,
      where: query.and(query.gte("effort", 1), query.lte("effort", 3), query.eq("effort", null)),
    });

    expect(compiled.sql).toContain(
      "(json_extract(entities.entity, '$.' || json_quote(?)) >= ? AND json_extract(entities.entity, '$.' || json_quote(?)) <= ? AND json_extract(entities.entity, '$.' || json_quote(?)) IS NULL)",
    );
    expect(compiled.sql).toContain("LIMIT -1 OFFSET ?");
    expect(compiled.bindings).toEqual(["habits", "effort", 1, "effort", 3, "effort", 4]);
  });

  it("compiles primitive-array membership with type-aware comparisons", () => {
    const compiled = compileQuery("habits", {
      where: query.and(query.includes("tags", "home"), query.excludes("flags", true)),
    });

    expect(compiled.sql).toContain(
      "json_each(json_extract(entities.entity, '$.' || json_quote(?))) AS member WHERE typeof(member.key) = 'integer'",
    );
    expect(compiled.sql).toContain("member.type = 'text' AND member.value = ?");
    expect(compiled.sql).toContain("NOT EXISTS");
    expect(compiled.sql).toContain("member.type = 'true'");
    expect(compiled.bindings).toEqual(["habits", "tags", "home", "flags"]);
  });

  it("handles null-safe and empty set membership", () => {
    const includesNull = compileQuery("habits", {
      where: query.in("effort", [2, null]),
    });
    const excludesValues = compileQuery("habits", {
      where: query.notIn("effort", [1, 3]),
    });
    const includesNothing = compileQuery("habits", {
      where: query.in("effort", []),
    });
    const excludesNothing = compileQuery("habits", {
      where: query.notIn("effort", []),
    });

    expect(includesNull.sql).toContain(
      "(COALESCE(json_extract(entities.entity, '$.' || json_quote(?)) IN (?), FALSE) OR json_extract(entities.entity, '$.' || json_quote(?)) IS NULL)",
    );
    expect(includesNull.bindings).toEqual(["habits", "effort", 2, "effort"]);
    expect(excludesValues.sql).toContain(
      "NOT (COALESCE(json_extract(entities.entity, '$.' || json_quote(?)) IN (?, ?), FALSE))",
    );
    expect(excludesValues.bindings).toEqual(["habits", "effort", 1, 3]);
    expect(includesNothing.sql).toContain("AND FALSE");
    expect(excludesNothing.sql).toContain("AND TRUE");
  });

  it("uses the external entity ID and reserves it from array queries", () => {
    const compiled = compileQuery("habits", {
      orderBy: [query.desc("id")],
      where: query.eq("id", "habit-1"),
    });

    expect(compiled.sql).toContain("entities.entity_id = ?");
    expect(compiled.sql).toContain("ORDER BY entities.entity_id DESC");
    expect(compiled.bindings).toEqual(["habits", "habit-1"]);

    const invalid = {
      field: "id",
      kind: "membership",
      operator: "includes",
      value: "x",
    } as unknown as QueryPredicate;
    expect(() => compileQuery("habits", { where: invalid })).toThrow(
      "Array queries require array fields.",
    );
  });

  it("validates untrusted ASTs and keeps field names in bindings", () => {
    const unsafeField = "name') OR TRUE --";
    const dynamicQuery = getQueryBuilder<Record<string, string>>();
    const compiled = compileQuery("habits", {
      where: dynamicQuery.eq(unsafeField, "value"),
    });

    expect(compiled.sql).not.toContain(unsafeField);
    expect(compiled.sql).toContain("json_extract(entities.entity, '$.' || json_quote(?))");
    expect(compiled.bindings).toEqual(["habits", unsafeField, "value"]);
    expect(() => compileQuery("habits", { limit: -1 })).toThrow(
      "Query limit must be a nonnegative safe integer.",
    );
    expect(() =>
      compileQuery("habits", {
        where: {
          field: "effort",
          kind: "comparison",
          operator: "eq",
          value: Number.NaN,
        } as unknown as QueryPredicate,
      }),
    ).toThrow("Query comparison numbers must be finite.");
    expect(() =>
      compileQuery("habits", {
        orderBy: [{ direction: "sideways", field: "name" }] as never,
      }),
    ).toThrow("Query ordering must be created with the builder.");
    expect(() => compileQuery("habits", { orderBy: null as never })).toThrow(
      "Query orderBy must be an array.",
    );
    expect(() => compileQuery("habits", { orderBy: Array.from({ length: 1 }) as never })).toThrow(
      "Query ordering must be created with the builder.",
    );
    expect(() =>
      compileQuery("habits", {
        where: query.in("name", Array.from<string>({ length: 1 })),
      }),
    ).toThrow("Query comparison values must be scalar JSON values.");

    const cyclic = {
      expressions: [] as QueryPredicate[],
      kind: "group",
      operator: "and",
    };
    cyclic.expressions.push(query.eq("active", true), cyclic as unknown as QueryPredicate);
    expect(() => compileQuery("habits", { where: cyclic as unknown as QueryPredicate })).toThrow(
      "Query predicates cannot contain cycles.",
    );

    expect(() => compileQuery("habits", null as unknown as QueryDefinition)).toThrow(
      "A query must return an options object.",
    );
  });
});
