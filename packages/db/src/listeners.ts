/**
 * Reports a listener failure without disturbing the caller. A listener must never
 * make a committed database write, or another listener's update, appear to fail.
 */
export function reportListenerError(message: string, error: unknown): void {
  if (typeof globalThis.reportError === "function") {
    globalThis.reportError(error);
  } else {
    console.error(message, error);
  }
}

/** Invokes every listener, isolating each from the others' failures. */
export function notifyListeners<Listener extends (...args: never[]) => unknown>(
  listeners: Iterable<Listener>,
  message: string,
  invoke: (listener: Listener) => void,
): void {
  for (const listener of Array.from(listeners)) {
    try {
      invoke(listener);
    } catch (error) {
      reportListenerError(message, error);
    }
  }
}
