import { expect, test } from "vite-plus/test";
import { hello } from "../src/index.ts";

test("says hello", () => {
  expect(hello).toBe("Hello from @byearlybird/schema!");
});
