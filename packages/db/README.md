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

Install `@capacitor-community/sqlite` and `@capacitor/core` when using the Capacitor
adapter. Install `@sqlite.org/sqlite-wasm` when using the OPFS adapter exported from
`@byearlybird/db/opfs`.
