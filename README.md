# SDK by Early Bird

A TypeScript monorepo for Early Bird's shared schemas, components, and database tools.

## Workspace

- `@byearlybird/schema` — shared schema primitives
- `@byearlybird/components` — shared component primitives
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
