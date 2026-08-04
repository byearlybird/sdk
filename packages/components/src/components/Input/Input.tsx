import { Input as BaseInput } from "@base-ui/react/input";
import type { Ref } from "react";
import { mergeClassName } from "../../utils/mergeClassName.ts";
import styles from "./Input.module.css";

export interface InputProps extends Omit<BaseInput.Props, "ref"> {
  /**
   * A ref to the rendered input element.
   */
  ref?: Ref<HTMLElement>;
}

export function Input({ className, ref, ...props }: InputProps) {
  return (
    <BaseInput
      {...props}
      ref={ref}
      className={mergeClassName<BaseInput.State>(styles.input, className)}
    />
  );
}
