# SDK by Early Bird

A TypeScript monorepo for Early Bird's shared schemas, components, and database tools.

## Workspace

- `@byearlybird/schema` — Schema by Early Bird, a lightweight Standard Schema library
- `@byearlybird/components` — reusable React components and design tokens
- `@byearlybird/db` — shared database primitives
- `apps/demo-client` — a private React SPA for trying the packages

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

- Run the development server:

```bash
vp run dev
```
