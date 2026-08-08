import { describe, expect, it } from "vite-plus/test";
import {
  compareVersions,
  createLamportClock,
  observeVersion,
  tickLamportClock,
} from "../src/clock.ts";

describe("Lamport clock", () => {
  it("ticks immutably and observes greater remote counters", () => {
    const initial = createLamportClock(2, "replica-a");
    const observed = observeVersion(initial, { counter: 12, replicaId: "replica-b" });
    const tick = tickLamportClock(observed);

    expect(initial).toEqual({ counter: 2, replicaId: "replica-a" });
    expect(observed).toEqual({ counter: 12, replicaId: "replica-a" });
    expect(tick).toEqual({
      clock: { counter: 13, replicaId: "replica-a" },
      version: { counter: 13, replicaId: "replica-a" },
    });
  });

  it("orders versions by counter and then replica ID", () => {
    expect(
      compareVersions(
        { counter: 2, replicaId: "replica-a" },
        { counter: 10, replicaId: "replica-a" },
      ),
    ).toBeLessThan(0);
    expect(
      compareVersions(
        { counter: 10, replicaId: "replica-a" },
        { counter: 10, replicaId: "replica-b" },
      ),
    ).toBeLessThan(0);
    expect(
      compareVersions(
        { counter: 10, replicaId: "replica-b" },
        { counter: 10, replicaId: "replica-b" },
      ),
    ).toBe(0);
  });

  it("rejects invalid state and counter overflow", () => {
    expect(() => createLamportClock(-1, "replica-a")).toThrow("nonnegative safe integer");
    expect(() => createLamportClock(0, "")).toThrow("cannot be empty");
    expect(() =>
      observeVersion(createLamportClock(0, "replica-a"), {
        counter: Number.MAX_SAFE_INTEGER,
        replicaId: "replica-b",
      }),
    ).toThrow("cannot be advanced");
    expect(() =>
      tickLamportClock(createLamportClock(Number.MAX_SAFE_INTEGER, "replica-a")),
    ).toThrow("overflowed");
  });
});
