import { clsx } from "clsx";
import type { ComponentPropsWithRef } from "react";
import styles from "./Button.module.css";

export type ButtonIconProps = ComponentPropsWithRef<"span">;

export function ButtonIcon({ children, className, ...props }: ButtonIconProps) {
  const classes = clsx(styles.icon, className);

  return (
    <span {...props} className={classes} data-slot="icon" aria-hidden="true">
      {children}
    </span>
  );
}
