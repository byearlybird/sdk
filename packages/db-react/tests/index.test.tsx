import type { Database, DatabaseEntry, DatabaseQuerySnapshot } from "@byearlybird/db";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, expectTypeOf, it } from "vite-plus/test";
import { createDatabaseReact } from "../src/index.tsx";

type TestSchema = {
  notes: {
    content: string;
  };
};

const database = createDatabaseFixture();
const { DatabaseProvider, useDatabase, useQuery, useSuspenseQuery } =
  createDatabaseReact<TestSchema>();

describe("createDatabaseReact", () => {
  it("provides the typed database", () => {
    function Consumer() {
      expect(useDatabase()).toBe(database);
      return null;
    }

    expect(
      renderToStaticMarkup(
        <DatabaseProvider database={database}>
          <Consumer />
        </DatabaseProvider>,
      ),
    ).toBe("");
  });

  it("rejects hooks outside the provider", () => {
    function Consumer() {
      useDatabase();
      return null;
    }

    expect(() => renderToStaticMarkup(<Consumer />)).toThrow(
      "useDatabase must be used inside DatabaseProvider.",
    );
  });

  it("returns a pending snapshot without suspending", () => {
    function Consumer() {
      const query = useQuery((queryDatabase) => queryDatabase.getAll("notes"));
      expect(query.status).toBe("pending");
      return query.status;
    }

    expect(
      renderToStaticMarkup(
        <DatabaseProvider database={database}>
          <Consumer />
        </DatabaseProvider>,
      ),
    ).toBe("pending");
  });

  it("infers query result types", () => {
    function useAssertQueryInference(): void {
      const query = useQuery((queryDatabase) => queryDatabase.getAll("notes"));
      expectTypeOf(query).toEqualTypeOf<
        DatabaseQuerySnapshot<DatabaseEntry<TestSchema["notes"]>[]>
      >();

      const notes = useSuspenseQuery((queryDatabase) => queryDatabase.getAll("notes"));
      expectTypeOf(notes).toEqualTypeOf<DatabaseEntry<TestSchema["notes"]>[]>();

      useQuery(async (queryDatabase) => {
        // @ts-expect-error Unknown collection names are rejected.
        await queryDatabase.getAll("missing");
      });
    }

    expectTypeOf(useAssertQueryInference).toBeFunction();
  });
});

function createDatabaseFixture(): Database<TestSchema> {
  return {
    ready: Promise.resolve(),
    close: async () => undefined,
    delete: async () => false,
    get: async () => null,
    getAll: async () => [],
    insert: async () => undefined,
    onChange: () => () => undefined,
    patch: async () => false,
    query: async () => [],
  };
}
