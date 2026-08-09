import { describe, expect, it } from "vite-plus/test";
import { createPullCursor, parsePullCursor } from "../src/transport.ts";

describe("pull cursors", () => {
  it("round trips sequences larger than JavaScript safe integers", () => {
    const sequence = 90_071_992_547_409_931_234_567_890n;
    const cursor = "90071992547409931234567890";
    expect(createPullCursor(sequence)).toBe(cursor);
    expect(parsePullCursor(cursor)).toBe(sequence);
  });

  it("rejects noncanonical cursors", () => {
    expect(() => parsePullCursor("01")).toThrow("canonical decimal");
    expect(() => createPullCursor(-1n)).toThrow("negative");
  });
});
