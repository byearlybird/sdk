# Sync by Early Bird

Shared synchronization types and rules for Early Bird apps, databases, and servers. Encryption is
optional and lives behind a separate entry point.

> [!NOTE]
> **Status: Beta.** Breaking changes are still possible before 1.0.

## Install

```sh
pnpm add @byearlybird/sync
```

## Changes and records

A `SyncChange` is either a complete live entity or a tombstone. Both forms include a stable change
ID and a Lamport version:

```ts
import type { SyncChange } from "@byearlybird/sync";

const change: SyncChange = {
  changeId: "01J...",
  collection: "tasks",
  deleted: false,
  entity: { title: "Write docs", completed: false },
  entityId: "task-1",
  format: 1,
  version: { counter: 12, replicaId: "device-a" },
};
```

Lamport versions are ordered first by `counter`, then by `replicaId`. This gives every version a
stable order when two replicas edit the same entity at the same logical time. A newer tombstone wins
over older live data, and a newer live version can intentionally recreate an entity.

`SyncChange` is the decoded client-side form. `SyncRecord` is the wire and server-storage form. Its
entity state is always an opaque string payload, whether that string contains JSON or ciphertext:

```ts
import { decodeSyncRecord, encodeSyncChange } from "@byearlybird/sync";

const record = encodeSyncChange(change, "com.example.tasks");
const decoded = decodeSyncRecord(record);
```

The root entry point also validates both forms and exports Lamport clock, transport, and pull cursor
helpers. `@byearlybird/db` owns its local SQLite tables, outbox, checkpoints, applying decoded
changes, and `createSynchronizer`.

## Optional encryption

`@byearlybird/sync/crypto` produces the same `SyncRecord` shape, but encrypts its payload with
AES-GCM through Web Crypto. The app domain, collection, entity ID, change ID, and version remain
visible so a server can route records, resolve versions, and handle retries. The live entity or
tombstone state is encrypted.

```ts
import { decryptSyncRecord, encryptSyncChange } from "@byearlybird/sync/crypto";

const key = await crypto.subtle.generateKey({ length: 256, name: "AES-GCM" }, false, [
  "decrypt",
  "encrypt",
]);

const encrypted = await encryptSyncChange(change, {
  appDomain: "com.example.tasks",
  key,
});

const plaintext = await decryptSyncRecord(encrypted, { key });
```

The visible fields are authenticated as additional data. Changing the app domain, entity address,
version, or change ID makes decryption fail. Each encryption uses a fresh nonce.

The package does not store, send, recover, or rotate keys. The application owns those choices. DB
does not depend on this entry point, so encryption remains fully opt-in.

## Server storage

The package does not provide an in-memory server implementation. A server should query and update
its database directly, storing one opaque `SyncRecord` for each `(app domain, collection, entity
ID)`. It can compare the visible Lamport versions with `compareVersions` and page by its own durable
sequence using `createPullCursor` and `parsePullCursor`.

The pull cursor is separate from the Lamport clock because a late offline client can upload an older
Lamport counter after the server has already seen newer counters elsewhere. Cursor helpers use
decimal strings and `bigint`, so the sequence does not stop at JavaScript's safe integer limit.

## License

MIT
