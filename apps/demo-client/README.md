# Demo client

A little to-do SPA that puts all four packages together: `@byearlybird/schema` defines the document
shape, `@byearlybird/db` stores it in OPFS-backed SQLite, `@byearlybird/db-react` reads it in
components, and `@byearlybird/components` renders the UI.

Run it alongside the [local sync relay](../demo-server) from the repository root:

```bash
vp install
vp run dev
```

On first load, each browser generates and locally stores a random AES-256-GCM setup key. Open the
client URL in two different browsers, copy the setup key shown in the first, and use it in the
second. Local mutations are encrypted before upload, pushed immediately, and pulled every five
seconds, so the two browsers converge without the relay seeing to-do contents.

This is intentionally demo-grade key management: the key is visible in the UI and stored in
`localStorage`, and there is no login, access control, rotation, or recovery flow. Importing a key
selects a separate local OPFS database so the browser restarts synchronization from a clean
checkpoint.

I'd start with `src/database.ts` for the schema and hook setup, then `src/App.tsx` for the reads and
writes.
