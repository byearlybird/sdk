# DB React by Early Bird

React bindings for [`@byearlybird/db`](../db), built for React 19.

Create one set of bindings for the application’s database schema:

```tsx
import { createDatabaseReact } from "@byearlybird/db-react";

const { DatabaseProvider, useDatabase, useQuery, useSuspenseQuery } =
  createDatabaseReact<AppDatabaseSchema>();
```

`DatabaseProvider` accepts a `database` prop. `useDatabase` returns that typed
database. `useQuery` returns a pending, error, or success snapshot without suspending.
`useSuspenseQuery` suspends while loading, throws query errors, and returns the resolved
value directly.
