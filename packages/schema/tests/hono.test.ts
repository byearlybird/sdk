import { sValidator } from "@hono/standard-validator";
import { Hono } from "hono";
import { describe, expect, expectTypeOf, it } from "vite-plus/test";

import { boolean, object, string } from "../src/index.ts";

const userSchema = object({
  name: string(),
  enabled: boolean({ default: false }),
});

const app = new Hono();

app.post("/users", sValidator("json", userSchema), (context) => {
  const user = context.req.valid("json");

  expectTypeOf(user).toEqualTypeOf<{
    name: string;
    enabled: boolean;
  }>();

  return context.json(user);
});

describe("Hono integration", () => {
  it("uses the validated Schema by Early Bird output", async () => {
    const response = await app.request("/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Ada" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      name: "Ada",
      enabled: false,
    });
  });

  it("returns Schema by Early Bird issues for invalid input", async () => {
    const response = await app.request("/users", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: 42 }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: [
        {
          message: "Expected a string.",
          path: ["name"],
        },
      ],
    });
  });
});
