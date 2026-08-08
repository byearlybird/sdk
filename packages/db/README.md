# DB by Early Bird

A typed, reactive JSON document database built on SQLite.

Describe your collections as TypeScript types and get inferred reads, writes, filtering, and
ordering. Queries rerun when the data behind them changes, and every write also produces a sync
change you can ship over whatever transport you like.

> [!NOTE]
> **Status: Beta.** The public API is mostly settled, but I'm not calling it done yet. Breaking
> changes are still possible before 1.0, and I'll call them out in the changelog.

## Install

```sh
pnpm add @byearlybird/db
```

The database talks to SQLite through a storage adapter, and each adapter brings its own peer
dependency. Just install the one that matches where your app runs:

| Environment    | Import                      | Also install                                     |
| -------------- | --------------------------- | ------------------------------------------------ |
| Browser (OPFS) | `@byearlybird/db/opfs`      | `@sqlite.org/sqlite-wasm`                        |
| Capacitor      | `@byearlybird/db/capacitor` | `@capacitor-community/sqlite`, `@capacitor/core` |

## Create a database

A schema is a plain TypeScript type mapping collection names to their document shapes. That's all
you need. `@byearlybird/schema` is a nice fit for validating input, but this package doesn't depend
on it.

```ts
import { createDatabase } from "@byearlybird/db";
import { opfsStorageAdapter } from "@byearlybird/db/opfs";

type AppSchema = {
  entries: {
    content: string;
    createdAt: string;
  };
};

const database = createDatabase<AppSchema>({
  name: "app",
  storage: opfsStorageAdapter,
});
```

On Capacitor, swap the adapter for `createCapacitorStorageAdapter()` from
`@byearlybird/db/capacitor`.

## Write

Documents are addressed by a collection name and an ID you choose:

```ts
await database.insert("entries", "entry-1", {
  content: "First entry",
  createdAt: new Date().toISOString(),
});

await database.patch("entries", "entry-1", { content: "Updated entry" });
await database.delete("entries", "entry-1");
```

`patch` merges the fields you pass; `patch` and `delete` return `false` when the document does not
exist.

### Batches

Use `batch` to apply a few mutations atomically. The callback records mutations in invocation order
and has to be synchronous:

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

If any mutation fails, the whole batch rolls back. Change listeners only hear about it after the
transaction commits.

## Read

`get` returns one document's data, `getAll` returns every entry in a collection, and `query` filters
and orders. Reads that return entries give you `{ id, data }` pairs:

```ts
const entry = await database.get("entries", "entry-1");
const all = await database.getAll("entries");

const recent = await database.query("entries", (query) => ({
  where: query.gte("createdAt", "2026-01-01"),
  orderBy: [query.desc("createdAt")],
  limit: 20,
}));

for (const { id, data } of recent) {
  console.log(id, data.content);
}
```

The builder is typed against the document shape, so field names and value types get checked, and
`id` is always there as a field.

| Builder                               | Matches                                   |
| ------------------------------------- | ----------------------------------------- |
| `eq(field, value)`                    | Exact scalar equality                     |
| `gt` / `gte` / `lt` / `lte`           | Ordered comparison on numbers and strings |
| `in(field, values)` / `notIn`         | Membership in a fixed set                 |
| `includes(field, value)` / `excludes` | An element inside a scalar array field    |
| `and(...)` / `or(...)`                | Grouped predicates                        |
| `asc(field)` / `desc(field)`          | Ordering, passed in `orderBy`             |

`limit` and `offset` paginate.

### Live queries

`createQuery` runs a read right away, then reruns it whenever one of the collections it touched
changes. It tracks those collections for you, so there's nothing to declare:

```ts
import { createQuery } from "@byearlybird/db";

const query = createQuery(database, (readonlyDatabase) =>
  readonlyDatabase.query("entries", (entry) => ({ orderBy: [entry.desc("createdAt")] })),
);

const unsubscribe = query.subscribe(() => {
  const snapshot = query.getSnapshot();
  if (snapshot.status === "success") render(snapshot.value);
});
```

`getSnapshot` gives you a `pending`, `success`, or `error` snapshot. In React, I'd reach for
[`@byearlybird/db-react`](https://github.com/byearlybird/sdk/tree/main/packages/db-react) rather than
wiring this up by hand.

If you want lower-level notifications, `database.onChange` fires with the collection, ID, and
operation for each committed mutation, and returns an unsubscribe function.

## Sync

Every committed mutation produces a coalesced sync change. Here's the gist: changes carry complete
entity snapshots or permanent tombstones, and they use Lamport versions so conflict resolution comes
out the same everywhere. Your app can trade changes over any transport by reading, applying, and
acknowledging batches:

```ts
const changes = await firstDatabase.getPendingChanges(100);

await secondDatabase.applyRemoteChanges(changes);
await firstDatabase.acknowledgeChanges(changes.map(({ changeId }) => changeId));
```

Applying changes is repeat-safe, and it still observes remote clocks even when the local entity
wins. Acknowledgments match the current change ID, so acknowledging an in-flight change can't clear
a newer local mutation for the same entity.

The shared change, clock, and transport types come from
[`@byearlybird/sync`](../sync). DB re-exports the existing types, so imports from `@byearlybird/db`
keep working. DB itself uses plaintext changes and does not require or enable encryption. An app can
choose to encrypt changes at its transport boundary with `@byearlybird/sync/crypto`.

### The synchronizer

`createSynchronizer` handles the paginated pulling, checkpoint persistence, and outbox pushing for
you. You bring the transport:

```ts
import { createSynchronizer } from "@byearlybird/db";
import type { SyncTransport } from "@byearlybird/sync";

const transport: SyncTransport = {
  pull: async ({ cursor, limit }) => {
    // Return changes after the opaque cursor and a durable next cursor.
    return relay.pull({ cursor, limit });
  },
  push: async ({ changes }) => {
    // Resolve only after every change has been durably accepted.
    await relay.push(changes);
  },
};

const synchronizer = createSynchronizer(database, { transport });
await synchronizer.sync();
```

A few details worth knowing:

- Pull pages commit atomically with their opaque checkpoints.
- Pushes are repeat-safe when the server treats the same `changeId` and version as a retry, so a lost
  response leaves the local outbox intact for another attempt.
- Syncing pulls before it pushes, and concurrent calls on one synchronizer share the same run.
- So, stick to one sync upstream for a database's lifetime.

> [!IMPORTANT]
> The synchronizer doesn't schedule, retry, time out, cancel, or back off. Those policies are on you
> to provide around `sync()`, and transport pushes need to be idempotent by `changeId`.

`apps/demo-server` in this repository is a pretty minimal relay that implements both transport
methods over HTTP, if you want something to copy from.

## License

MIT
