import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import type { ReactNode, Ref } from "react";
import { mergeClassName } from "../../utils/mergeClassName.ts";
import styles from "./Checkbox.module.css";

export interface CheckboxProps extends Omit<BaseCheckbox.Root.Props, "children" | "ref"> {
  ref?: Ref<HTMLElement>;
  /**
   * Replaces the default checkmark.
   */
  indicator?: ReactNode;
}

export function Checkbox({ className, indicator, ref, ...props }: CheckboxProps) {
  return (
    <BaseCheckbox.Root
      {...props}
      ref={ref}
      className={mergeClassName<BaseCheckbox.Root.State>(styles.root, className)}
    >
      <CheckboxIndicator>{indicator}</CheckboxIndicator>
    </BaseCheckbox.Root>
  );
}

export interface CheckboxIndicatorProps extends Omit<BaseCheckbox.Indicator.Props, "ref"> {
  ref?: Ref<HTMLSpanElement>;
}

export function CheckboxIndicator({ children, className, ref, ...props }: CheckboxIndicatorProps) {
  return (
    <BaseCheckbox.Indicator
      {...props}
      ref={ref}
      className={mergeClassName<BaseCheckbox.Indicator.State>(styles.indicator, className)}
    >
      {children ?? <CheckboxMark />}
    </BaseCheckbox.Indicator>
  );
}

function CheckboxMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
    >
      <path className={styles.checkmark} d="m3 8 3 3 7-7" />
      <path className={styles.indeterminateMark} d="M3 8h10" />
    </svg>
  );
}
