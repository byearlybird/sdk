import { clsx, type ClassValue } from "clsx";

type StateClassName<State> = string | ((state: State) => string | undefined);

export function mergeClassName<State>(
  baseClassName: ClassValue,
  className?: StateClassName<State>,
) {
  if (typeof className === "function") {
    return (state: State) => clsx(baseClassName, className(state));
  }

  return clsx(baseClassName, className);
}
