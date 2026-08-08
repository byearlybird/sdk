# Demo sync relay

A local Hono server that relays `@byearlybird/db` changes between demo clients. It implements the
`pull` and `push` halves of a [`SyncTransport`](../../packages/db#the-synchronizer) over HTTP, so
it's probably the smallest useful reference for writing your own.

> [!WARNING]
> This relay is for local demos only. There's no authentication and no user buckets, and it just
> persists one shared change log with unstorage's filesystem driver.

Run the [client](../demo-client) and relay from the repository root:

```bash
vp run dev
```

Open the client URL in two browsers. Local mutations get pushed immediately, and each browser pulls
changes every five seconds. If you want to clear the shared log, stop the server and delete
`apps/demo-server/data`.
