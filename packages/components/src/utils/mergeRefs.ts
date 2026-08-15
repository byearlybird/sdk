import type { Ref, RefCallback } from "react";

/**
 * Combines multiple refs into a single ref callback so an element can be
 * attached to an internal ref alongside a ref forwarded by the consumer.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref) {
        ref.current = value;
      }
    }
  };
}
