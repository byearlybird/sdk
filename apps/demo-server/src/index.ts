import { serve } from "@hono/node-server";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { createSqliteSyncStorage } from "./storage.js";

const port = 3001;
const dataDirectory = fileURLToPath(new URL("../data", import.meta.url));
await mkdir(dataDirectory, { recursive: true });
const storage = createSqliteSyncStorage(`${dataDirectory}/sync.sqlite`);
const app = createApp(storage);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Demo sync relay is running on http://localhost:${info.port}`);
});
