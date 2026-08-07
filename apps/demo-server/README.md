# Demo sync relay

A local Hono server that relays `@byearlybird/db` changes between demo clients. It has no
authentication or user buckets, and persists one shared change log with unstorage's filesystem
driver.

Run the client and relay from the repository root:

```bash
vp run dev
```

Open the client URL in two browsers. Local mutations are pushed immediately, and each browser pulls
changes every five seconds. Delete `apps/demo-server/data` while the server is stopped to clear the
shared log.
