import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import type { Ref } from "react";
import { mergeClassName } from "../../utils/mergeClassName.ts";
import styles from "./ToggleButton.module.css";

export type ToggleButtonTone = "neutral" | "primary" | "accent";
export type ToggleButtonSize = "small" | "default" | "large";

export interface ToggleButtonProps<Value extends string = string> extends Omit<
  BaseToggle.Props<Value>,
  "ref"
> {
  /**
   * A ref to the rendered element.
   */
  ref?: Ref<HTMLButtonElement>;
  /**
   * Controls the fill used while the toggle is pressed. `"accent"` draws on
   * `--eb-color-accent`, for attention that should not read as a primary action.
   * @default "neutral"
   */
  tone?: ToggleButtonTone;
  /**
   * Controls the diameter of the circle.
   * @default "default"
   */
  size?: ToggleButtonSize;
}

/**
 * A circular icon toggle. Provide an accessible name with `aria-label` — the
 * icon is the only visible content.
 */
export function ToggleButton<Value extends string = string>({
  className,
  ref,
  size = "default",
  tone = "neutral",
  ...props
}: ToggleButtonProps<Value>) {
  return (
    <BaseToggle
      {...props}
      ref={ref}
      className={mergeClassName<BaseToggle.State>(
        [styles.root, styles[tone], styles[size]],
        className,
      )}
    />
  );
}
