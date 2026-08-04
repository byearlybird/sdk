import { createContext, use, useContext, useEffect, useId, useSyncExternalStore } from "react";
import type { DependencyList, PropsWithChildren } from "react";
import { createQuery } from "@byearlybird/db";
import type {
  Database,
  DatabaseQuery,
  DatabaseQuerySnapshot,
  QueryDatabase,
} from "@byearlybird/db";

export type DatabaseProviderProps<Schema> = PropsWithChildren<{
  database: Database<Schema>;
}>;

export type DatabaseReact<Schema> = Readonly<{
  DatabaseProvider(props: DatabaseProviderProps<Schema>): React.ReactNode;
  useDatabase(): Database<Schema>;
  useQuery<Result>(
    load: (database: QueryDatabase<Schema>) => Promise<Result>,
    dependencies?: DependencyList,
  ): DatabaseQuerySnapshot<Result>;
  useSuspenseQuery<Result>(
    load: (database: QueryDatabase<Schema>) => Promise<Result>,
    dependencies?: DependencyList,
  ): Result;
}>;

type QueryRegistryEntry = {
  consumers: number;
  dependencies: DependencyList;
  query: DatabaseQuery<unknown>;
};

type QueryRegistry = Map<string, QueryRegistryEntry[]>;

/** Creates a typed database provider and hooks for one application schema. */
export function createDatabaseReact<Schema>(): DatabaseReact<Schema> {
  const DatabaseContext = createContext<Database<Schema> | null>(null);
  const queryRegistries = new WeakMap<Database<Schema>, QueryRegistry>();

  function DatabaseProvider({
    children,
    database,
  }: DatabaseProviderProps<Schema>): React.ReactNode {
    return <DatabaseContext value={database}>{children}</DatabaseContext>;
  }

  function useDatabase(): Database<Schema> {
    const database = useContext(DatabaseContext);
    if (database === null) {
      throw new Error("useDatabase must be used inside DatabaseProvider.");
    }
    return database;
  }

  function useQuery<Result>(
    load: (database: QueryDatabase<Schema>) => Promise<Result>,
    dependencies: DependencyList = [],
  ): DatabaseQuerySnapshot<Result> {
    return useQuerySnapshot(load, dependencies);
  }

  function useSuspenseQuery<Result>(
    load: (database: QueryDatabase<Schema>) => Promise<Result>,
    dependencies: DependencyList = [],
  ): Result {
    const snapshot = useQuerySnapshot(load, dependencies);
    if (snapshot.status === "pending") return use(snapshot.promise);
    if (snapshot.status === "error") throw snapshot.error;
    return snapshot.value;
  }

  function useQuerySnapshot<Result>(
    load: (database: QueryDatabase<Schema>) => Promise<Result>,
    dependencies: DependencyList,
  ): DatabaseQuerySnapshot<Result> {
    const database = useDatabase();
    const queryId = useId();
    const registry = getQueryRegistry(database);
    let entries = registry.get(queryId);
    if (entries === undefined) {
      entries = [];
      registry.set(queryId, entries);
    }

    let entry = entries.find((candidate) => sameDependencies(candidate.dependencies, dependencies));
    if (entry === undefined) {
      entry = {
        consumers: 0,
        dependencies: Object.freeze([...dependencies]),
        query: createQuery(database, load),
      };
      entries.push(entry);
    }

    useEffect(() => {
      entry.consumers += 1;
      return () => {
        entry.consumers -= 1;
        queueMicrotask(() => {
          if (entry.consumers !== 0) return;
          const currentEntries = registry.get(queryId);
          if (currentEntries === undefined) return;
          const index = currentEntries.indexOf(entry);
          if (index === -1) return;
          currentEntries.splice(index, 1);
          if (currentEntries.length === 0) registry.delete(queryId);
        });
      };
    }, [entry, queryId, registry]);

    const query = entry.query as DatabaseQuery<Result>;
    return useSyncExternalStore(query.subscribe, query.getSnapshot, query.getSnapshot);
  }

  function getQueryRegistry(database: Database<Schema>): QueryRegistry {
    let registry = queryRegistries.get(database);
    if (registry === undefined) {
      registry = new Map();
      queryRegistries.set(database, registry);
    }
    return registry;
  }

  return Object.freeze({ DatabaseProvider, useDatabase, useQuery, useSuspenseQuery });
}

function sameDependencies(left: DependencyList, right: DependencyList): boolean {
  return (
    left.length === right.length &&
    left.every((dependency, index) => Object.is(dependency, right[index]))
  );
}
