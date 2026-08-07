import type { SyncChange, SyncPushRequest } from "@byearlybird/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Storage } from "unstorage";

const changesKey = "changes";

export async function createApp(storage: Storage<SyncChange[]>): Promise<Hono> {
  const app = new Hono();
  const changes = (await storage.getItem(changesKey)) ?? [];
  const changeIds = new Set(changes.map(({ changeId }) => changeId));
  let pushQueue = Promise.resolve();

  app.use("*", cors());

  app.get("/sync/pull", (context) => {
    const start = Number(context.req.query("cursor") ?? 0);
    const limit = Number(context.req.query("limit") ?? 100);
    const end = Math.min(start + limit, changes.length);
    return context.json({
      changes: changes.slice(start, end),
      cursor: String(end),
      hasMore: end < changes.length,
    });
  });

  app.post("/sync/push", async (context) => {
    const body = await context.req.json<SyncPushRequest>();
    const push = pushQueue.then(async () => {
      const newChangeIds = new Set<string>();
      const additions = body.changes.filter(({ changeId }) => {
        if (changeIds.has(changeId) || newChangeIds.has(changeId)) return false;
        newChangeIds.add(changeId);
        return true;
      });
      if (additions.length === 0) return;
      await storage.setItem(changesKey, [...changes, ...additions]);
      changes.push(...additions);
      for (const { changeId } of additions) changeIds.add(changeId);
    });
    pushQueue = push.catch(() => undefined);
    await push;
    return context.body(null, 204);
  });

  return app;
}
