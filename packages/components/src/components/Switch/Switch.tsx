import { Switch as BaseSwitch } from "@base-ui/react/switch";
import type { ReactNode, Ref } from "react";
import { mergeClassName } from "../../utils/mergeClassName.ts";
import type { WithRef } from "../../utils/withRef.ts";
import styles from "./Switch.module.css";

export interface SwitchProps extends Omit<BaseSwitch.Root.Props, "children" | "ref"> {
  ref?: Ref<HTMLElement>;
  /**
   * Content rendered inside the switch thumb.
   */
  thumb?: ReactNode;
}

export function Switch({ className, ref, thumb, ...props }: SwitchProps) {
  return (
    <BaseSwitch.Root
      {...props}
      ref={ref}
      className={mergeClassName<BaseSwitch.Root.State>(styles.root, className)}
    >
      <SwitchThumb>{thumb}</SwitchThumb>
    </BaseSwitch.Root>
  );
}

export type SwitchThumbProps = WithRef<BaseSwitch.Thumb.Props, HTMLSpanElement>;

export function SwitchThumb({ className, ref, ...props }: SwitchThumbProps) {
  return (
    <BaseSwitch.Thumb
      {...props}
      ref={ref}
      className={mergeClassName<BaseSwitch.Thumb.State>(styles.thumb, className)}
    />
  );
}
