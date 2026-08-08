# SDK by Early Bird

Building blocks for local-first TypeScript apps: a reactive SQLite database that syncs, its React
bindings, a tiny schema validator, and a React component library.

Each package stands alone, so take one or take all four. They just happen to fit together nicely.

> [!NOTE]
> **Status: Beta.** The public APIs are mostly settled, but I'm not calling them done yet. Breaking
> changes are still possible before 1.0, and I'll call them out in the changelog rather than ship
> them quietly.

## Packages

### [@byearlybird/db](packages/db) — a typed, reactive database on SQLite

Define collections as TypeScript types, then read and write them with full inference. Every write
also produces a sync change you can ship over whatever transport you like.

```ts
type AppSchema = { todos: { title: string; completed: boolean; createdAt: string } };

const database = createDatabase<AppSchema>({ name: "app", storage: opfsStorageAdapter });

await database.insert("todos", "todo-1", { title: "Write the docs", completed: false, createdAt });
const todos = await database.query("todos", (query) => ({ orderBy: [query.asc("createdAt")] }));
```

[**Read more →**](packages/db)

### [@byearlybird/db-react](packages/db-react) — React bindings for the database

Typed hooks for React 19. Queries rerun on their own whenever a collection they read changes, so
there's no cache to invalidate and no keys to manage.

```tsx
const todos = useSuspenseQuery((database) =>
  database.query("todos", (query) => ({ orderBy: [query.asc("createdAt")] })),
);
```

[**Read more →**](packages/db-react)

### [@byearlybird/schema](packages/schema) — a seriously lightweight Standard Schema library

Strict schemas for JSON-serializable data, and nothing else. No unions, transforms, or coercion.
Validation hands back a result instead of throwing.

```ts
const taskSchema = object({ id: string(), title: string({ minLength: 1 }) });

const result = taskSchema.validate({ id: "t1", title: "Write the docs" });
result.issues ? console.error(result.issues) : result.value;
```

[**Read more →**](packages/schema)

### [@byearlybird/components](packages/components) — React components and design tokens

Accessible components built on Base UI and CSS Modules, themed with a documented set of `--eb-`
custom properties. Override the tokens you care about and the whole set follows.

```tsx
<Button>
  <ButtonIcon>
    <SearchIcon />
  </ButtonIcon>
  Search
</Button>
```

[**Read more →**](packages/components)

## Demos

- [`apps/demo-client`](apps/demo-client) — a React SPA that uses all four packages together
- [`apps/demo-server`](apps/demo-server) — a local Hono relay that syncs two browsers over HTTP

Run both from the repository root:

```bash
vp install
vp run dev
```

Open the client URL in two different browsers. Both clients poll the shared local relay, so they
should converge within about five seconds. It's a fun one to watch.

## Contributing

This is a [Vite+](https://viteplus.dev) monorepo. Install dependencies after pulling:

```bash
vp install
```

Format, lint, type check, and test everything:

```bash
vp run ready
```

Run the tests or build every package:

```bash
vp run -r test
vp run -r build
```

## License

MIT
