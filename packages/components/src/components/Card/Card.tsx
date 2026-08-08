import { clsx } from "clsx";
import type { ComponentPropsWithoutRef, Ref } from "react";
import styles from "./Card.module.css";

export interface CardProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * A ref to the rendered element.
   */
  ref?: Ref<HTMLDivElement>;
}

export function Card({ className, ref, ...props }: CardProps) {
  return <div {...props} ref={ref} className={clsx(styles.card, className)} />;
}

export interface CardImageProps extends ComponentPropsWithoutRef<"img"> {
  /**
   * A ref to the rendered image.
   */
  ref?: Ref<HTMLImageElement>;
}

export function CardImage({ className, ref, ...props }: CardImageProps) {
  return <img {...props} ref={ref} className={clsx(styles.image, className)} />;
}

export interface CardHeaderProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * A ref to the rendered element.
   */
  ref?: Ref<HTMLDivElement>;
}

export function CardHeader({ className, ref, ...props }: CardHeaderProps) {
  return <div {...props} ref={ref} className={clsx(styles.header, className)} />;
}

export type CardTitleLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface CardTitleProps extends ComponentPropsWithoutRef<"h2"> {
  /**
   * The heading element to render. Choose the level that fits the surrounding
   * document outline.
   *
   * @default "h2"
   */
  as?: CardTitleLevel;
  /**
   * A ref to the rendered heading.
   */
  ref?: Ref<HTMLHeadingElement>;
}

export function CardTitle({ as: Heading = "h2", className, ref, ...props }: CardTitleProps) {
  return <Heading {...props} ref={ref} className={clsx(styles.title, className)} />;
}

export interface CardContentProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * A ref to the rendered element.
   */
  ref?: Ref<HTMLDivElement>;
}

export function CardContent({ className, ref, ...props }: CardContentProps) {
  return <div {...props} ref={ref} className={clsx(styles.content, className)} />;
}
