import { validateSyncRecord } from "@byearlybird/sync";
import type { SyncRecord } from "@byearlybird/sync";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { SyncStorage } from "./storage.js";

export function createApp(storage: SyncStorage): Hono {
  const app = new Hono();

  app.use("*", cors());

  // Every validation helper here throws, so bad requests must not read as server faults.
  app.onError((error, context) =>
    error instanceof TypeError || error instanceof RangeError || error instanceof SyntaxError
      ? context.json({ error: error.message }, 400)
      : context.json({ error: "Internal Server Error" }, 500),
  );

  // Routing guarantees a nonempty app domain, so the handlers never have to check for one.
  app.get("/api/v1/apps/:appDomain/sync/pull", (context) => {
    const page = storage.pull({
      appDomain: context.req.param("appDomain"),
      cursor: context.req.query("cursor") ?? null,
      limit: Number(context.req.query("limit") ?? 100),
    });
    return context.json(page);
  });

  app.post("/api/v1/apps/:appDomain/sync/push", async (context) => {
    const appDomain = context.req.param("appDomain");
    const changes = validatePushBody(await context.req.json<unknown>());
    storage.push(appDomain, changes);
    return context.body(null, 204);
  });

  return app;
}

function validatePushBody(value: unknown): readonly SyncRecord[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("A sync push body must be an object.");
  }
  const { changes } = value as Record<string, unknown>;
  if (!Array.isArray(changes)) {
    throw new TypeError("A sync push body must contain a changes array.");
  }
  return changes.map(validateSyncRecord);
}
