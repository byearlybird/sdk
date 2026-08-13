import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import styles from "./TabBar.module.css";

export interface TabBarProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * A ref to the rendered element.
   */
  ref?: Ref<HTMLDivElement>;
  /**
   * Rendered beside the navigation pill, typically a floating action button:
   * `<Button size="icon" variant="primary" aria-label="…">`.
   */
  action?: ReactNode;
  /**
   * Accessible name for the navigation landmark.
   * @default "Primary"
   */
  label?: string;
}

/**
 * A pill-shaped navigation row with an optional trailing action, for mobile
 * bottom navigation. Children are `TabBarItem`s.
 */
export function TabBar({
  action,
  children,
  className,
  label = "Primary",
  ref,
  ...props
}: TabBarProps) {
  return (
    <div {...props} ref={ref} className={clsx(styles.root, className)} data-slot="tab-bar">
      <nav aria-label={label} className={styles.nav}>
        {children}
      </nav>
      {action}
    </div>
  );
}

export interface TabBarItemProps extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
  /**
   * A ref to the rendered element.
   */
  ref?: Ref<HTMLButtonElement>;
  /**
   * The glyph shown above the label. Decorative — the label names the tab.
   */
  icon?: ReactNode;
  /**
   * The text shown beneath the icon.
   */
  label: ReactNode;
  /**
   * Marks the tab as the current destination.
   * @default false
   */
  active?: boolean;
}

export function TabBarItem({
  active = false,
  className,
  icon,
  label,
  ref,
  type = "button",
  ...props
}: TabBarItemProps) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      aria-current={active ? "page" : undefined}
      data-active={active ? "" : undefined}
      className={clsx(styles.item, className)}
    >
      <span aria-hidden="true" className={styles.icon}>
        {icon}
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}
