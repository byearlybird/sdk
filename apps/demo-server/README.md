# Demo sync relay

A local Hono server that relays plaintext [`@byearlybird/sync`](../../packages/sync) changes between
demo clients. It implements the `pull` and `push` halves of a
[`SyncTransport`](../../packages/sync#plaintext-sync) over HTTP.

The app domain is a required path segment, so every request names the data it is reaching for:

```
GET  /api/v1/apps/com.byearlybird.demo/sync/pull?cursor=12&limit=100
POST /api/v1/apps/com.byearlybird.demo/sync/push
```

The relay stores one latest record for each app domain, collection, and entity ID. A newer Lamport
version replaces the old record and receives a new server sequence. Pull cursors use that server
sequence, not the Lamport version. Tombstones remain in storage forever, which keeps an older live
record from bringing deleted data back.

> [!WARNING]
> This relay is for local demos only. It has no authentication, authorization, rate limits, or
> production database. The client picks its own app domain in the URL, so the relay does not enforce
> who may read or write a domain. A real server would derive that segment's access rules from
> trusted authentication instead of trusting the path.

Run the [client](../demo-client) and relay from the repository root:

```bash
vp run dev
```

Open the client URL in two browsers. Local mutations get pushed immediately, and each browser pulls
changes every five seconds. The relay stores its state in `apps/demo-server/data/sync.sqlite`. If you
want to clear the shared state, stop the server and delete `apps/demo-server/data`.
