import { Toggle as BaseToggle } from "@base-ui/react/toggle";
import { ToggleGroup as BaseToggleGroup } from "@base-ui/react/toggle-group";
import type { Ref } from "react";
import { mergeClassName } from "../../utils/mergeClassName.ts";
import styles from "./SegmentedControl.module.css";

export type SegmentedControlSize = "default" | "large";
export type SegmentedControlVariant = "neutral" | "primary";

export interface SegmentedControlProps<Value extends string = string> extends Omit<
  BaseToggleGroup.Props<Value>,
  "ref"
> {
  /**
   * A ref to the rendered element.
   */
  ref?: Ref<HTMLDivElement>;
  /**
   * Controls the height and type scale of the segments.
   * @default "default"
   */
  size?: SegmentedControlSize;
  /**
   * Controls how the selected segment is filled. `"neutral"` raises it on the
   * surface color; `"primary"` fills it with the primary color.
   * @default "neutral"
   */
  variant?: SegmentedControlVariant;
  /**
   * Stretches the track to the full width of its container and divides it
   * evenly between the segments.
   * @default false
   */
  fullWidth?: boolean;
}

/**
 * A pill-shaped group of mutually exclusive options. Exactly one segment is
 * selected at a time — pass `multiple` through only if you genuinely want a
 * multi-select toggle group.
 */
export function SegmentedControl<Value extends string = string>({
  className,
  fullWidth = false,
  ref,
  size = "default",
  variant = "neutral",
  ...props
}: SegmentedControlProps<Value>) {
  return (
    <BaseToggleGroup
      {...props}
      ref={ref}
      data-size={size}
      data-variant={variant}
      data-full-width={fullWidth ? "" : undefined}
      className={mergeClassName<BaseToggleGroup.State>(styles.root, className)}
    />
  );
}

export interface SegmentedControlItemProps<Value extends string = string> extends Omit<
  BaseToggle.Props<Value>,
  "ref"
> {
  /**
   * A ref to the rendered element.
   */
  ref?: Ref<HTMLButtonElement>;
}

export function SegmentedControlItem<Value extends string = string>({
  className,
  ref,
  ...props
}: SegmentedControlItemProps<Value>) {
  return (
    <BaseToggle
      {...props}
      ref={ref}
      className={mergeClassName<BaseToggle.State>(styles.item, className)}
    />
  );
}
