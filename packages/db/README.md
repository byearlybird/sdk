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

Install `@capacitor-community/sqlite` and `@capacitor/core` when using the Capacitor
adapter. Install `@sqlite.org/sqlite-wasm` when using the OPFS adapter exported from
`@byearlybird/db/opfs`.
