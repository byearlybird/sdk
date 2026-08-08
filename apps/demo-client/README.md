# Demo client

A little to-do SPA that puts all four packages together: `@byearlybird/schema` defines the document
shape, `@byearlybird/db` stores it in OPFS-backed SQLite, `@byearlybird/db-react` reads it in
components, and `@byearlybird/components` renders the UI.

Run it alongside the [local sync relay](../demo-server) from the repository root:

```bash
vp install
vp run dev
```

Open the client URL in two different browsers. Local mutations get pushed immediately and each
browser pulls every five seconds, so the two converge within about five seconds.

I'd start with `src/database.ts` for the schema and hook setup, then `src/App.tsx` for the reads and
writes.
