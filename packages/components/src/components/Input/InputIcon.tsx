import { clsx } from "clsx";
import type { ComponentPropsWithRef } from "react";
import styles from "./Input.module.css";

export type InputIconProps = ComponentPropsWithRef<"span">;

export function InputIcon({ children, className, ...props }: InputIconProps) {
  const classes = clsx(styles.icon, className);

  return (
    <span {...props} className={classes} data-slot="icon" aria-hidden="true">
      {children}
    </span>
  );
}
