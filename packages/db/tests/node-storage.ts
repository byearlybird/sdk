import { DatabaseSync } from "node:sqlite";
import type { StatementSync } from "node:sqlite";
import { readChangeCount } from "../src/storage.ts";
import type {
  SqliteBinding,
  SqliteRow,
  StorageAdapter,
  StorageCommand,
  StorageCommandResult,
  StorageConnection,
} from "../src/storage.ts";

export function createNodeStorageAdapter(filename = ":memory:"): StorageAdapter {
  return {
    open: async () => createConnection(new DatabaseSync(filename)),
  };
}

function createConnection(database: DatabaseSync): StorageConnection {
  let closed = false;
  let queue = Promise.resolve();

  function enqueue<Result>(operation: () => Result): Promise<Result> {
    if (closed) return Promise.reject(new Error("The SQLite database is closed."));
    const result = queue.then(operation);
    queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return {
    close: () => {
      closed = true;
      return queue.then(() => database.close());
    },
    executeTransaction: (commands) =>
      enqueue(() => {
        if (commands.length === 0) return [];
        database.exec("BEGIN");
        try {
          const results = commands.map((command) => executeCommand(database, command));
          database.exec("COMMIT");
          return results;
        } catch (error) {
          database.exec("ROLLBACK");
          throw error;
        }
      }),
    query: (sql, bindings = []) => enqueue(() => readRows(database.prepare(sql), bindings)),
    run: (sql, bindings = []) =>
      enqueue(() => {
        const result = database.prepare(sql).run(...bindings);
        return { changes: readChangeCount(result.changes) };
      }),
  };
}

function executeCommand(database: DatabaseSync, command: StorageCommand): StorageCommandResult {
  const statement = database.prepare(command.sql);
  if (command.kind === "query") {
    return { kind: "query", rows: readRows(statement, command.bindings ?? []) };
  }
  const result = statement.run(...(command.bindings ?? []));
  return { changes: readChangeCount(result.changes), kind: "run" };
}

function readRows(statement: StatementSync, bindings: readonly SqliteBinding[]): SqliteRow[] {
  return statement.all(...bindings).map((row) => ({ ...row }));
}
