# DB React by Early Bird

React bindings for [`@byearlybird/db`](https://github.com/byearlybird/sdk/tree/main/packages/db).

Create one typed set of hooks for your database schema, then read from the database in your
components. Queries rerun on their own whenever a collection they touched changes, so there's no
cache to invalidate and no keys to manage. That part is kinda my favorite.

> [!NOTE]
> **Status: Beta.** The public API is mostly settled, but I'm not calling it done yet. Breaking
> changes are still possible before 1.0, and I'll call them out in the changelog rather than ship
> them quietly.

## Install

```sh
pnpm add @byearlybird/db-react @byearlybird/db
```

Needs React 19.2 or later. This one is React 19 only, and there's no CommonJS build.

## Use

Call `createDatabaseReact` once with your schema, then export what it hands back:

```tsx
import { createDatabase } from "@byearlybird/db";
import { createDatabaseReact } from "@byearlybird/db-react";
import { opfsStorageAdapter } from "@byearlybird/db/opfs";

type AppSchema = { todos: { title: string; completed: boolean; createdAt: string } };

export const database = createDatabase<AppSchema>({ name: "app", storage: opfsStorageAdapter });
export const { DatabaseProvider, useDatabase, useQuery, useSuspenseQuery } =
  createDatabaseReact<AppSchema>();
```

Wrap the app in the provider:

```tsx
<DatabaseProvider database={database}>
  <App />
</DatabaseProvider>
```

Then read and write:

```tsx
function Todos() {
  const database = useDatabase();
  const todos = useSuspenseQuery((readonlyDatabase) =>
    readonlyDatabase.query("todos", (query) => ({ orderBy: [query.asc("createdAt")] })),
  );

  return (
    <ul>
      {todos.map(({ data, id }) => (
        <li key={id} onClick={() => void database.patch("todos", id, { completed: true })}>
          {data.title}
        </li>
      ))}
    </ul>
  );
}
```

## API

| Export             | Returns                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `DatabaseProvider` | Provides the database to the tree. Takes a `database` prop.                               |
| `useDatabase`      | The typed database, for writes and anything outside a query.                              |
| `useQuery`         | A `pending`, `error`, or `success` snapshot, without suspending.                          |
| `useSuspenseQuery` | The resolved value. Suspends while loading and throws query errors to the error boundary. |

Both query hooks take a load function and an optional dependency list, which follows the `useEffect`
convention:

```tsx
const snapshot = useQuery((readonlyDatabase) => readonlyDatabase.get("todos", todoId), [todoId]);

if (snapshot.status === "pending") return <Spinner />;
if (snapshot.status === "error") return <Error error={snapshot.error} />;
return <Todo todo={snapshot.value} />;
```

The database handed to a load function only exposes `get`, `getAll`, and `query`. Writes go through
`useDatabase` instead.

## License

MIT
