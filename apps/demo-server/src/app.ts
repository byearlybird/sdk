import { validateSyncChange } from "@byearlybird/sync";
import type { SyncChange } from "@byearlybird/sync";
import {
  createLatestSyncState,
  mergeServerChanges,
  pullLatestSyncRecords,
  restoreLatestSyncState,
} from "@byearlybird/sync/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { SyncStorage } from "./storage.js";

const stateKey = "sync-state";

export async function createApp(storage: SyncStorage): Promise<Hono> {
  const app = new Hono();
  const stored = storage.getItem(stateKey);
  let state =
    stored === null
      ? createLatestSyncState<SyncChange>()
      : restoreLatestSyncState(stored, validateSyncChange);
  let pushQueue = Promise.resolve();

  app.use("*", cors());

  // Every validation helper here throws, so bad requests must not read as server faults.
  app.onError((error, context) =>
    error instanceof TypeError || error instanceof RangeError || error instanceof SyntaxError
      ? context.json({ error: error.message }, 400)
      : context.json({ error: "Internal Server Error" }, 500),
  );

  // Routing guarantees a nonempty app domain, so the handlers never have to check for one.
  app.get("/api/v1/apps/:appDomain/sync/pull", (context) => {
    const page = pullLatestSyncRecords(state, {
      appDomain: context.req.param("appDomain"),
      cursor: context.req.query("cursor") ?? null,
      limit: Number(context.req.query("limit") ?? 100),
    });
    return context.json(page);
  });

  app.post("/api/v1/apps/:appDomain/sync/push", async (context) => {
    const appDomain = context.req.param("appDomain");
    const changes = validatePushBody(await context.req.json<unknown>());
    const push = pushQueue.then(() => {
      const nextState = mergeServerChanges(state, appDomain, changes);
      if (nextState === state) return;
      storage.setItem(stateKey, nextState);
      state = nextState;
    });
    pushQueue = push.catch(() => undefined);
    await push;
    return context.body(null, 204);
  });

  return app;
}

function validatePushBody(value: unknown): readonly SyncChange[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("A sync push body must be an object.");
  }
  const { changes } = value as Record<string, unknown>;
  if (!Array.isArray(changes)) {
    throw new TypeError("A sync push body must contain a changes array.");
  }
  return changes.map(validateSyncChange);
}
