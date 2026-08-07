import { serve } from "@hono/node-server";
import type { SyncChange } from "@byearlybird/db";
import { fileURLToPath } from "node:url";
import { createStorage } from "unstorage";
import fsLiteDriver from "unstorage/drivers/fs-lite";
import { createApp } from "./app.js";

const port = 3001;
const storage = createStorage<SyncChange[]>({
  driver: fsLiteDriver({ base: fileURLToPath(new URL("../data", import.meta.url)) }),
});
const app = await createApp(storage);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Demo sync relay is running on http://localhost:${info.port}`);
});
