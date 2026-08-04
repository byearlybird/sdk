import { clsx } from "clsx";
import type { ComponentPropsWithRef } from "react";
import styles from "./Input.module.css";

export type InputGroupProps = ComponentPropsWithRef<"div">;

export function InputGroup({ children, className, ...props }: InputGroupProps) {
  return (
    <div {...props} className={clsx(styles.group, className)} data-slot="input-group">
      {children}
    </div>
  );
}
