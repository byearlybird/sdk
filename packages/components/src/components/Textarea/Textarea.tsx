import { clsx } from "clsx";
import type { ComponentPropsWithRef } from "react";
import styles from "./Textarea.module.css";

export type TextareaVariant = "default" | "muted";

export type TextareaProps = ComponentPropsWithRef<"textarea"> & {
  /**
   * Controls the textarea's visual treatment.
   * @default "default"
   */
  variant?: TextareaVariant;
};

export function Textarea({ className, variant = "default", ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={clsx(styles.textarea, variant === "muted" && styles.muted, className)}
    />
  );
}
