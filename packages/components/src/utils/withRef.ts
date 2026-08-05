import type { Ref } from "react";

/**
 * Replaces a component's `ref` prop with one typed for `Element`.
 *
 * React 19 passes `ref` as an ordinary prop, so components accept it directly
 * rather than through `forwardRef`. See AGENTS.md.
 */
export type WithRef<Props, Element> = Omit<Props, "ref"> & {
  ref?: Ref<Element>;
};
