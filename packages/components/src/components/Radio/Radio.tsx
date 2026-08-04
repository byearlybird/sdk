import { Radio as BaseRadio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import type { Ref } from "react";
import { mergeClassName } from "../../utils/mergeClassName.ts";
import styles from "./Radio.module.css";

export interface RadioGroupProps<Value = unknown> extends Omit<BaseRadioGroup.Props<Value>, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function RadioGroup<Value = unknown>({ className, ref, ...props }: RadioGroupProps<Value>) {
  return (
    <BaseRadioGroup
      {...props}
      ref={ref}
      className={mergeClassName<BaseRadioGroup.State>(styles.group, className)}
    />
  );
}

export interface RadioProps<Value = unknown> extends Omit<
  BaseRadio.Root.Props<Value>,
  "children" | "ref"
> {
  ref?: Ref<HTMLElement>;
}

export function Radio<Value = unknown>({ className, ref, ...props }: RadioProps<Value>) {
  return (
    <BaseRadio.Root
      {...props}
      ref={ref}
      className={mergeClassName<BaseRadio.Root.State>(styles.root, className)}
    >
      <RadioIndicator />
    </BaseRadio.Root>
  );
}

export interface RadioIndicatorProps extends Omit<BaseRadio.Indicator.Props, "ref"> {
  ref?: Ref<HTMLSpanElement>;
}

export function RadioIndicator({ className, ref, ...props }: RadioIndicatorProps) {
  return (
    <BaseRadio.Indicator
      {...props}
      ref={ref}
      className={mergeClassName<BaseRadio.Indicator.State>(styles.indicator, className)}
    />
  );
}
