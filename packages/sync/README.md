# Sync by Early Bird

Shared synchronization rules for Early Bird apps, databases, and servers.

The root package contains the plaintext protocol. Encryption and server storage helpers live behind
separate entry points, so using the core package does not turn on encryption or add a key-management
requirement.

> [!NOTE]
> **Status: Beta.** Breaking changes are still possible before 1.0.

## Install

```sh
pnpm add @byearlybird/sync
```

## Plaintext sync

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

The root entry point exports:

- Lamport clock creation, ticking, observation, comparison, and validation.
- Live change, tombstone, change ID, and version types.
- Change validation for wire data, including JSON-safe entity values.
- Pull request, pull page, push request, and transport types.

`@byearlybird/db` uses this plaintext protocol. It still owns SQLite, its local outbox, checkpoints,
applying remote changes, and `createSynchronizer`.

## Optional encryption

`@byearlybird/sync/crypto` converts a normal change into an `EncryptedSyncRecord` with an opaque
payload string. It uses AES-GCM through Web Crypto. The app domain, collection, entity ID, change
ID, version, and key ID remain visible so a server can route records, resolve versions, and handle
retries. The live entity or tombstone state is encrypted.

```ts
import { decryptSyncRecord, encryptSyncChange } from "@byearlybird/sync/crypto";

const key = await crypto.subtle.generateKey({ length: 256, name: "AES-GCM" }, false, [
  "decrypt",
  "encrypt",
]);

const encrypted = await encryptSyncChange(change, {
  appDomain: "com.example.tasks",
  key,
  keyId: "main-key",
});

const plaintext = await decryptSyncRecord(encrypted, { key });
```

The visible fields are authenticated as additional data. Changing the app domain, entity address,
version, change ID, or key ID makes decryption fail. Each encryption uses a fresh nonce.

The package does not store, send, recover, or rotate keys. The application owns those choices. DB
does not depend on this entry point, so encryption remains fully opt-in.

## Latest-state server storage

`@byearlybird/sync/server` provides pure helpers for a relay that stores one record for each
`(app domain, collection, entity ID)`:

```ts
import {
  createLatestSyncState,
  mergeServerChange,
  pullLatestSyncRecords,
} from "@byearlybird/sync/server";

let state = createLatestSyncState();
state = mergeServerChange(state, "com.example.tasks", change).state;

const page = pullLatestSyncRecords(state, {
  appDomain: "com.example.tasks",
  cursor: null,
  limit: 100,
});
```

When an incoming Lamport version wins, it replaces the stored record and receives a new server
sequence. Repeated or older changes do not receive a sequence. The pull cursor is the server
sequence encoded as a canonical decimal string. It is separate from the Lamport clock because a
late offline client can upload an older Lamport counter after the server has already seen newer
counters elsewhere.

The sequence uses decimal strings and `bigint`, so it does not stop at JavaScript's safe integer
limit. Helpers are also provided to create, parse, increment, and validate cursors, and to validate
saved latest-state data after a restart.

The helpers are storage-neutral. A real server should persist the returned state atomically and
derive the app domain from trusted authentication or authorization data. It should keep tombstones
forever unless it introduces a separate, safe garbage-collection protocol. Storage therefore grows
with distinct entity IDs, not with every operation over time.

The helpers work with plaintext `SyncChange` values and with encrypted records because both expose
the metadata needed for version comparison and routing.

## License

MIT
