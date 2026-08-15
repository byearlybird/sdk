import { Button as BaseButton } from "@base-ui/react/button";
import { clsx } from "clsx";
import type { Ref } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "default" | "icon";

export interface ButtonProps extends Omit<BaseButton.Props, "ref"> {
  /**
   * A ref to the rendered element.
   */
  ref?: Ref<HTMLElement>;
  /**
   * Controls the visual prominence of the button.
   * @default "primary"
   */
  variant?: ButtonVariant;
  /**
   * Controls whether the button uses its default layout or a square icon layout.
   * Provide an accessible name with `aria-label` when using `"icon"`.
   * @default "default"
   */
  size?: ButtonSize;
}

export function Button({
  children,
  className,
  ref,
  size = "default",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      {...props}
      ref={ref}
      className={(state) =>
        clsx(
          styles.button,
          styles[variant],
          size === "icon" ? styles.iconSize : undefined,
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      {children}
    </BaseButton>
  );
}
