import { clsx } from "clsx";
import { type ComponentPropsWithRef, useEffect, useLayoutEffect, useRef } from "react";
import { mergeRefs } from "../../utils/mergeRefs.ts";
import styles from "./Textarea.module.css";

export type TextareaVariant = "default" | "muted";

export type TextareaProps = ComponentPropsWithRef<"textarea"> & {
  /**
   * Controls the textarea's visual treatment.
   * @default "default"
   */
  variant?: TextareaVariant;
  /**
   * Grows and shrinks the textarea's height to fit its content instead of
   * showing a resize handle or internal scrollbar.
   * @default false
   */
  autoResize?: boolean;
  /**
   * Caps how tall the textarea can grow when `autoResize` is enabled.
   */
  maxHeight?: number | string;
};

export function Textarea({
  autoResize = false,
  className,
  maxHeight,
  onInput,
  ref,
  style,
  value,
  variant = "default",
  ...props
}: TextareaProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const el = internalRef.current;

    if (!el) {
      return;
    }

    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useLayoutEffect(() => {
    if (autoResize) {
      resize();
    }
  }, [autoResize, value]);

  useEffect(() => {
    if (!autoResize) {
      return;
    }

    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
  }, [autoResize]);

  return (
    <textarea
      {...props}
      ref={mergeRefs(internalRef, ref)}
      value={value}
      style={autoResize && maxHeight != null ? { ...style, maxHeight } : style}
      onInput={(event) => {
        onInput?.(event);
        if (autoResize) {
          resize();
        }
      }}
      className={clsx(
        styles.textarea,
        variant === "muted" && styles.muted,
        autoResize && styles.autoResize,
        className,
      )}
    />
  );
}
