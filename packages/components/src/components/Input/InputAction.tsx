import { clsx } from "clsx";
import type { ComponentPropsWithRef } from "react";
import styles from "./Input.module.css";

export type InputActionProps = ComponentPropsWithRef<"button">;

export function InputAction({ children, className, type = "button", ...props }: InputActionProps) {
  const classes = clsx(styles.action, className);

  return (
    <button {...props} className={classes} data-slot="action" type={type}>
      {children}
    </button>
  );
}
