import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createCapacitorStorageAdapter } from "../src/capacitor.ts";

type ConnectionManager = NonNullable<Parameters<typeof createCapacitorStorageAdapter>[0]>;
type DatabaseConnection = Awaited<ReturnType<ConnectionManager["createConnection"]>>;

type MockDatabase = {
  isDBOpen: ReturnType<typeof vi.fn<DatabaseConnection["isDBOpen"]>>;
  open: ReturnType<typeof vi.fn<DatabaseConnection["open"]>>;
  query: ReturnType<typeof vi.fn<DatabaseConnection["query"]>>;
  run: ReturnType<typeof vi.fn<DatabaseConnection["run"]>>;
};

let database: MockDatabase;
let connectionManager: ConnectionManager;
let checkConnectionsConsistency: ReturnType<
  typeof vi.fn<ConnectionManager["checkConnectionsConsistency"]>
>;
let closeConnection: ReturnType<typeof vi.fn<ConnectionManager["closeConnection"]>>;
let createConnection: ReturnType<typeof vi.fn<ConnectionManager["createConnection"]>>;
let isConnection: ReturnType<typeof vi.fn<ConnectionManager["isConnection"]>>;
let retrieveConnection: ReturnType<typeof vi.fn<ConnectionManager["retrieveConnection"]>>;

beforeEach(() => {
  database = {
    isDBOpen: vi.fn<DatabaseConnection["isDBOpen"]>().mockResolvedValue({ result: false }),
    open: vi.fn<DatabaseConnection["open"]>().mockResolvedValue(undefined),
    query: vi.fn<DatabaseConnection["query"]>().mockResolvedValue({ values: [] }),
    run: vi.fn<DatabaseConnection["run"]>().mockResolvedValue({ changes: { changes: 0 } }),
  };
  checkConnectionsConsistency = vi
    .fn<ConnectionManager["checkConnectionsConsistency"]>()
    .mockResolvedValue({ result: true });
  closeConnection = vi.fn<ConnectionManager["closeConnection"]>().mockResolvedValue(undefined);
  createConnection = vi.fn<ConnectionManager["createConnection"]>().mockResolvedValue(database);
  isConnection = vi.fn<ConnectionManager["isConnection"]>().mockResolvedValue({ result: false });
  retrieveConnection = vi.fn<ConnectionManager["retrieveConnection"]>().mockResolvedValue(database);
  connectionManager = {
    checkConnectionsConsistency,
    closeConnection,
    createConnection,
    isConnection,
    retrieveConnection,
  };
});

describe("createCapacitorStorageAdapter", () => {
  it("opens an unencrypted read-write database", async () => {
    const storage = createCapacitorStorageAdapter(connectionManager);

    await storage.open("daybook");

    expect(checkConnectionsConsistency).toHaveBeenCalledOnce();
    expect(isConnection).toHaveBeenCalledWith("daybook", false);
    expect(createConnection).toHaveBeenCalledWith("daybook", false, "no-encryption", 1, false);
    expect(database.isDBOpen).toHaveBeenCalledOnce();
    expect(database.open).toHaveBeenCalledOnce();
  });

  it("reuses an existing open connection", async () => {
    isConnection.mockResolvedValue({ result: true });
    database.isDBOpen.mockResolvedValue({ result: true });
    const storage = createCapacitorStorageAdapter(connectionManager);

    await storage.open("daybook");

    expect(retrieveConnection).toHaveBeenCalledWith("daybook", false);
    expect(createConnection).not.toHaveBeenCalled();
    expect(database.open).not.toHaveBeenCalled();
  });

  it("reconciles stranded native connections before creating one", async () => {
    checkConnectionsConsistency.mockResolvedValue({ result: false });
    const storage = createCapacitorStorageAdapter(connectionManager);

    await storage.open("daybook");

    expect(checkConnectionsConsistency).toHaveBeenCalledOnce();
    expect(createConnection).toHaveBeenCalledOnce();
  });

  it("queries rows and reports affected rows from writes", async () => {
    database.query.mockResolvedValue({
      values: [{ entity: '{"value":1}', entity_id: "counter" }],
    });
    database.run.mockResolvedValue({ changes: { changes: 2 } });
    const connection = await createCapacitorStorageAdapter(connectionManager).open("daybook");

    await expect(
      connection.query("SELECT * FROM entities WHERE collection = ?", ["counters"]),
    ).resolves.toEqual([{ entity: '{"value":1}', entity_id: "counter" }]);
    await expect(
      connection.run("DELETE FROM entities WHERE collection = ?", ["counters"]),
    ).resolves.toEqual({ changes: 2 });

    expect(database.query).toHaveBeenCalledWith("SELECT * FROM entities WHERE collection = ?", [
      "counters",
    ]);
    expect(database.run).toHaveBeenCalledWith("DELETE FROM entities WHERE collection = ?", [
      "counters",
    ]);
  });

  it("closes the managed connection once and rejects later operations", async () => {
    const connection = await createCapacitorStorageAdapter(connectionManager).open("daybook");

    await connection.close();
    await connection.close();

    expect(closeConnection).toHaveBeenCalledOnce();
    expect(closeConnection).toHaveBeenCalledWith("daybook", false);
    await expect(connection.query("SELECT 1")).rejects.toThrow("closed");
    await expect(connection.run("DELETE FROM entities")).rejects.toThrow("closed");
  });

  it("serializes operations and waits for them before closing", async () => {
    let finishQuery!: (result: { values: [] }) => void;
    database.query.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishQuery = resolve;
        }),
    );
    const connection = await createCapacitorStorageAdapter(connectionManager).open("daybook");

    const query = connection.query("SELECT 1");
    const run = connection.run("DELETE FROM entities");
    await vi.waitFor(() => expect(database.query).toHaveBeenCalledOnce());
    expect(database.run).not.toHaveBeenCalled();

    const close = connection.close();
    expect(closeConnection).not.toHaveBeenCalled();
    finishQuery({ values: [] });

    await expect(query).resolves.toEqual([]);
    await expect(run).resolves.toEqual({ changes: 0 });
    await expect(close).resolves.toBeUndefined();
    expect(database.run).toHaveBeenCalledOnce();
    expect(closeConnection).toHaveBeenCalledOnce();
  });

  it("cleans up a connection that fails to open", async () => {
    database.open.mockRejectedValue(new Error("Could not open database."));
    const storage = createCapacitorStorageAdapter(connectionManager);

    await expect(storage.open("daybook")).rejects.toThrow("Could not open database.");

    expect(closeConnection).toHaveBeenCalledWith("daybook", false);
  });

  it("rejects invalid plugin results", async () => {
    database.query.mockResolvedValue({ values: [null] });
    database.run.mockResolvedValue({ changes: {} });
    const connection = await createCapacitorStorageAdapter(connectionManager).open("daybook");

    await expect(connection.query("SELECT 1")).rejects.toThrow("invalid row");
    await expect(connection.run("DELETE FROM entities")).rejects.toThrow("affected-row count");
  });
});
