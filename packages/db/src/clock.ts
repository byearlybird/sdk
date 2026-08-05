export type LamportClock = Readonly<{
  counter: number;
  replicaId: string;
}>;

export type Version = Readonly<{
  counter: number;
  replicaId: string;
}>;

export type ClockTick = Readonly<{
  clock: LamportClock;
  version: Version;
}>;

export function createLamportClock(counter: number, replicaId: string): LamportClock {
  assertCounter(counter);
  if (replicaId.length === 0) throw new TypeError("A replica ID cannot be empty.");
  return Object.freeze({ counter, replicaId });
}

export function compareVersions(left: Version, right: Version): number {
  if (left.counter !== right.counter) return left.counter < right.counter ? -1 : 1;
  if (left.replicaId === right.replicaId) return 0;
  return left.replicaId < right.replicaId ? -1 : 1;
}

export function observeVersion(clock: LamportClock, version: Version): LamportClock {
  assertVersion(version);
  if (version.counter >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError("The remote Lamport clock counter cannot be advanced.");
  }
  return version.counter > clock.counter
    ? Object.freeze({ counter: version.counter, replicaId: clock.replicaId })
    : clock;
}

export function tickLamportClock(clock: LamportClock): ClockTick {
  if (clock.counter >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError("The Lamport clock counter overflowed.");
  }

  const nextClock = Object.freeze({
    counter: clock.counter + 1,
    replicaId: clock.replicaId,
  });
  return Object.freeze({
    clock: nextClock,
    version: Object.freeze({ counter: nextClock.counter, replicaId: nextClock.replicaId }),
  });
}

export function assertVersion(version: Version): void {
  if (version === null || typeof version !== "object" || Array.isArray(version)) {
    throw new TypeError("A sync version must be an object.");
  }
  assertCounter(version.counter);
  if (typeof version.replicaId !== "string" || version.replicaId.length === 0) {
    throw new TypeError("A sync version replica ID must be a nonempty string.");
  }
}

function assertCounter(counter: number): void {
  if (!Number.isSafeInteger(counter) || counter < 0) {
    throw new TypeError("A Lamport clock counter must be a nonnegative safe integer.");
  }
}
