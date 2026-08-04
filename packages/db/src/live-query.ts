import type { CollectionName, Database, DatabaseChange } from "./database.ts";

export type QueryDatabase<Schema> = Pick<Database<Schema>, "get" | "getAll" | "query">;

export type DatabaseQuerySnapshot<Result> =
  | Readonly<{ promise: Promise<Result>; status: "pending" }>
  | Readonly<{ status: "success"; value: Result }>
  | Readonly<{ error: unknown; status: "error" }>;

export type DatabaseQuery<Result> = Readonly<{
  getSnapshot(): DatabaseQuerySnapshot<Result>;
  subscribe(listener: () => void): () => void;
}>;

type ScheduledRun<Result> = {
  notify: boolean;
  promise: Promise<Result>;
  started: boolean;
};

/**
 * Runs a database read immediately and reruns it while subscribed when one of its
 * accessed collections changes.
 */
export function createQuery<Schema, Result>(
  database: Database<Schema>,
  load: (database: QueryDatabase<Schema>) => Promise<Result>,
): DatabaseQuery<Result> {
  const listeners = new Set<() => void>();
  let accessedCollections = new Set<CollectionName<Schema>>();
  let loadingCollections: Set<CollectionName<Schema>> | undefined;
  const readonlyDatabase = selectReads(database, (collection) => {
    (loadingCollections ?? accessedCollections).add(collection);
  });

  const run = async (): Promise<Result> => {
    const currentCollections = new Set<CollectionName<Schema>>();
    loadingCollections = currentCollections;
    try {
      return await load(readonlyDatabase);
    } finally {
      accessedCollections = currentCollections;
      if (loadingCollections === currentCollections) loadingCollections = undefined;
    }
  };

  const initialRun = runLoader(run);
  let snapshot: DatabaseQuerySnapshot<Result> = pending(initialRun);
  let queue = initialRun.then(
    (value) => {
      snapshot = success(value);
    },
    (error: unknown) => {
      snapshot = failure(error);
    },
  );
  let scheduledRun: ScheduledRun<Result> | undefined;
  let unsubscribeDatabase: (() => void) | undefined;

  function publish(): void {
    for (const listener of Array.from(listeners)) {
      try {
        listener();
      } catch (error) {
        reportListenerError(error);
      }
    }
  }

  function schedule(notify: boolean): Promise<Result> {
    if (scheduledRun !== undefined && !scheduledRun.started) {
      scheduledRun.notify ||= notify;
      return scheduledRun.promise;
    }

    const nextRun = {
      notify,
      promise: undefined as unknown as Promise<Result>,
      started: false,
    };
    const loading = queue.then(() => {
      nextRun.started = true;
      return run();
    });
    const completed = loading.then(
      (value) => {
        finishRun(nextRun, success(value));
        return value;
      },
      (error: unknown) => {
        finishRun(nextRun, failure(error));
        throw error;
      },
    );
    nextRun.promise = completed;
    scheduledRun = nextRun;
    queue = completed.then(settled, settled);
    return completed;
  }

  function finishRun(run: ScheduledRun<Result>, nextSnapshot: DatabaseQuerySnapshot<Result>): void {
    if (scheduledRun === run) {
      scheduledRun = undefined;
      snapshot = nextSnapshot;
      if (run.notify) publish();
    } else if (scheduledRun !== undefined) {
      scheduledRun.notify ||= run.notify;
    }
  }

  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      if (unsubscribeDatabase === undefined) {
        unsubscribeDatabase = database.onChange((change) => {
          if (dependsOn(change, accessedCollections, loadingCollections)) {
            void schedule(true);
          }
        });
        if (snapshot.status !== "pending") void schedule(true);
      }

      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        listeners.delete(listener);
        queueMicrotask(() => {
          if (listeners.size !== 0 || unsubscribeDatabase === undefined) return;
          unsubscribeDatabase();
          unsubscribeDatabase = undefined;
        });
      };
    },
  });
}

function selectReads<Schema>(
  database: Database<Schema>,
  recordAccess: (collection: CollectionName<Schema>) => void,
): QueryDatabase<Schema> {
  const get: Database<Schema>["get"] = (collection, id) => {
    recordAccess(collection);
    return database.get(collection, id);
  };

  const getAll: Database<Schema>["getAll"] = (collection) => {
    recordAccess(collection);
    return database.getAll(collection);
  };

  const query: Database<Schema>["query"] = (collection, build) => {
    recordAccess(collection);
    return database.query(collection, build);
  };

  return Object.freeze({ get, getAll, query });
}

function dependsOn<Schema>(
  change: DatabaseChange<Schema>,
  accessedCollections: ReadonlySet<CollectionName<Schema>>,
  loadingCollections: ReadonlySet<CollectionName<Schema>> | undefined,
): boolean {
  return (
    accessedCollections.has(change.collection) ||
    loadingCollections?.has(change.collection) === true
  );
}

function runLoader<Result>(load: () => Promise<Result>): Promise<Result> {
  return Promise.resolve().then(load);
}

function pending<Result>(promise: Promise<Result>): DatabaseQuerySnapshot<Result> {
  return Object.freeze({ promise, status: "pending" });
}

function success<Result>(value: Result): DatabaseQuerySnapshot<Result> {
  return Object.freeze({ status: "success", value });
}

function failure<Result>(error: unknown): DatabaseQuerySnapshot<Result> {
  return Object.freeze({ error, status: "error" });
}

function settled(): void {}

function reportListenerError(error: unknown): void {
  try {
    if (typeof globalThis.reportError === "function") {
      globalThis.reportError(error);
    } else {
      console.error("A database query listener failed.", error);
    }
  } catch {
    // Error reporting must not disrupt query updates or other listeners.
  }
}
