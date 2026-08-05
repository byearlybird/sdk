# DB by Early Bird

A typed, reactive JSON document database built on SQLite.

Collections and their document shapes are described with a TypeScript schema. The
database stores strict JSON values, supports typed filtering and ordering, and emits
collection changes for live queries.

```ts
import { createDatabase } from "@byearlybird/db";
import { createCapacitorStorageAdapter } from "@byearlybird/db/capacitor";

type AppSchema = {
  entries: {
    content: string;
    createdAt: string;
  };
};

const database = createDatabase<AppSchema>({
  name: "app",
  storage: createCapacitorStorageAdapter(),
});
```

Apply multiple mutations atomically with `batch`. The callback records mutations in
invocation order and must be synchronous:

```ts
await database.batch((mutation) => {
  mutation.insert("entries", "entry-1", {
    content: "First entry",
    createdAt: new Date().toISOString(),
  });
  mutation.patch("entries", "entry-2", { content: "Updated entry" });
  mutation.delete("entries", "entry-3");
});
```

If any mutation fails, the entire batch is rolled back. Change listeners are notified
only after the transaction commits.

Every committed mutation also produces a coalesced synchronization change. Changes
contain complete entity snapshots or permanent tombstones and use Lamport versions
for deterministic conflict resolution. Applications can exchange changes through any
transport by reading, applying, and acknowledging batches:

```ts
const changes = await firstDatabase.getPendingChanges(100);

await secondDatabase.applyRemoteChanges(changes);
await firstDatabase.acknowledgeChanges(changes.map(({ changeId }) => changeId));
```

Applying changes is repeat-safe and observes remote clocks even when the local entity
wins. Acknowledgments match the current change ID, so acknowledging an in-flight
change cannot clear a newer local mutation for the same entity.

Use `createSynchronizer` to orchestrate paginated pulling, checkpoint persistence,
and outbox pushing with a transport-independent adapter:

```ts
import { createSynchronizer } from "@byearlybird/db";

const synchronizer = createSynchronizer(database, {
  transport: {
    pull: async ({ cursor, limit }) => {
      // Return changes after the opaque cursor and a durable next cursor.
      return relay.pull({ cursor, limit });
    },
    push: async ({ changes }) => {
      // Resolve only after every change has been durably accepted.
      await relay.push(changes);
    },
  },
});

await synchronizer.sync();
```

Pull pages are committed atomically with their opaque checkpoints. Pushes are
repeat-safe when the transport deduplicates by `changeId`, so a lost response leaves
the local outbox intact for retry. Synchronization pulls before it pushes, and
concurrent calls on one synchronizer share the same run. A database supports one
synchronization upstream for its lifetime.

Connect to an HTTP sync server with a transport that acquires a fresh bearer token
before every request:

```ts
import { createHttpSyncTransport } from "@byearlybird/db/http";

const httpTransport = createHttpSyncTransport({
  serverUrl: "https://sync.example.com",
  getToken: () => auth.getToken(),
});

const httpSynchronizer = createSynchronizer(database, { transport: httpTransport });
```

The HTTP transport does not schedule or retry synchronization. Failed HTTP responses
throw `HttpSyncResponseError`, which exposes the response status and any `Retry-After`
header.

For local tests, share one in-memory transport between the databases that should
synchronize:

```ts
import { createInMemorySyncTransport, createSynchronizer } from "@byearlybird/db";

const transport = createInMemorySyncTransport();
const firstSync = createSynchronizer(firstDatabase, { transport });
const secondSync = createSynchronizer(secondDatabase, { transport });

await firstSync.sync();
await secondSync.sync();
```

The transport is process-local and append-only. Create a new transport for each isolated test.

Install `@capacitor-community/sqlite` and `@capacitor/core` when using the Capacitor
adapter. Install `@sqlite.org/sqlite-wasm` when using the OPFS adapter exported from
`@byearlybird/db/opfs`.
