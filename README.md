# SDK by Early Bird

A TypeScript monorepo for Early Bird's shared schemas, components, and database tools.

## Workspace

- `@byearlybird/schema` — Schema by Early Bird, a lightweight Standard Schema library
- `@byearlybird/components` — reusable React components and design tokens
- `@byearlybird/db` — DB by Early Bird, a typed reactive database built on SQLite
- `@byearlybird/db-react` — React providers and query hooks for DB by Early Bird
- `apps/demo-client` — a private React SPA for trying the packages
- `apps/demo-server` — a local Hono relay for demonstrating browser-to-browser database sync

## Development

- Install dependencies:

```bash
vp install
```

- Check everything is ready:

```bash
vp run ready
```

- Run the tests:

```bash
vp run -r test
```

- Build the monorepo:

```bash
vp run -r build
```

- Run the demo client and local sync relay:

```bash
vp run dev
```

Open the client URL in two different browsers. Both clients poll the shared local relay and should
converge within about five seconds. The relay is intentionally unauthenticated and persists one
shared change log locally with unstorage.
