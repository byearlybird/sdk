import { Select as BaseSelect } from "@base-ui/react/select";
import { clsx } from "clsx";
import type { ComponentPropsWithRef, ReactNode, Ref } from "react";
import { mergeClassName } from "../../utils/mergeClassName.ts";
import styles from "./Select.module.css";

export type SelectProps<
  Value,
  Multiple extends boolean | undefined = false,
> = BaseSelect.Root.Props<Value, Multiple>;

export function Select<Value, Multiple extends boolean | undefined = false>(
  props: SelectProps<Value, Multiple>,
) {
  return <BaseSelect.Root {...props} />;
}

export interface SelectLabelProps extends Omit<BaseSelect.Label.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function SelectLabel({ className, ref, ...props }: SelectLabelProps) {
  return (
    <BaseSelect.Label
      {...props}
      ref={ref}
      className={mergeClassName<BaseSelect.Label.State>(styles.label, className)}
    />
  );
}

export interface SelectTriggerProps extends Omit<BaseSelect.Trigger.Props, "children" | "ref"> {
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
  /**
   * Replaces the default caret. Pass `null` to hide the trailing icon.
   */
  icon?: ReactNode;
}

export function SelectTrigger({ children, className, icon, ref, ...props }: SelectTriggerProps) {
  return (
    <BaseSelect.Trigger
      {...props}
      ref={ref}
      className={mergeClassName<BaseSelect.Trigger.State>(styles.trigger, className)}
    >
      {children}
      {icon === null ? null : <SelectIcon>{icon}</SelectIcon>}
    </BaseSelect.Trigger>
  );
}

export type SelectLeadingIconProps = ComponentPropsWithRef<"span">;

export function SelectLeadingIcon({ children, className, ...props }: SelectLeadingIconProps) {
  return (
    <span
      {...props}
      className={clsx(styles.leadingIcon, className)}
      data-slot="leading-icon"
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

export interface SelectValueProps extends Omit<BaseSelect.Value.Props, "ref"> {
  ref?: Ref<HTMLSpanElement>;
}

export function SelectValue({ className, ref, ...props }: SelectValueProps) {
  return (
    <BaseSelect.Value
      {...props}
      ref={ref}
      className={mergeClassName<BaseSelect.Value.State>(styles.value, className)}
    />
  );
}

export interface SelectIconProps extends Omit<BaseSelect.Icon.Props, "ref"> {
  ref?: Ref<HTMLSpanElement>;
}

export function SelectIcon({ children, className, ref, ...props }: SelectIconProps) {
  return (
    <BaseSelect.Icon
      {...props}
      ref={ref}
      className={mergeClassName<BaseSelect.Icon.State>(styles.icon, className)}
    >
      {children ?? <CaretIcon />}
    </BaseSelect.Icon>
  );
}

export const SelectPortal = BaseSelect.Portal;

export interface SelectPositionerProps extends Omit<BaseSelect.Positioner.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function SelectPositioner({
  className,
  ref,
  sideOffset = 8,
  ...props
}: SelectPositionerProps) {
  return (
    <BaseSelect.Positioner
      {...props}
      ref={ref}
      sideOffset={sideOffset}
      className={mergeClassName<BaseSelect.Positioner.State>(styles.positioner, className)}
    />
  );
}

export interface SelectPopupProps extends Omit<BaseSelect.Popup.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function SelectPopup({ className, ref, ...props }: SelectPopupProps) {
  return (
    <BaseSelect.Popup
      {...props}
      ref={ref}
      className={mergeClassName<BaseSelect.Popup.State>(styles.popup, className)}
    />
  );
}

export interface SelectContentProps extends SelectPopupProps {
  align?: SelectPositionerProps["align"];
  alignItemWithTrigger?: SelectPositionerProps["alignItemWithTrigger"];
  alignOffset?: SelectPositionerProps["alignOffset"];
  container?: BaseSelect.Portal.Props["container"];
  side?: SelectPositionerProps["side"];
  sideOffset?: SelectPositionerProps["sideOffset"];
}

export function SelectContent({
  align,
  alignItemWithTrigger,
  alignOffset,
  container,
  side,
  sideOffset,
  ...popupProps
}: SelectContentProps) {
  return (
    <SelectPortal container={container}>
      <SelectPositioner
        align={align}
        alignItemWithTrigger={alignItemWithTrigger}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <SelectPopup {...popupProps} />
      </SelectPositioner>
    </SelectPortal>
  );
}

export interface SelectListProps extends Omit<BaseSelect.List.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function SelectList({ className, ref, ...props }: SelectListProps) {
  return (
    <BaseSelect.List
      {...props}
      ref={ref}
      className={mergeClassName<BaseSelect.List.State>(styles.list, className)}
    />
  );
}

export interface SelectItemProps extends Omit<BaseSelect.Item.Props, "children" | "ref"> {
  children: ReactNode;
  ref?: Ref<HTMLElement>;
  /**
   * Replaces the default checkmark. Pass `null` to hide the indicator.
   */
  indicator?: ReactNode;
}

export function SelectItem({ children, className, indicator, ref, ...props }: SelectItemProps) {
  return (
    <BaseSelect.Item
      {...props}
      ref={ref}
      className={mergeClassName<BaseSelect.Item.State>(styles.item, className)}
    >
      {indicator === null ? null : <SelectItemIndicator>{indicator}</SelectItemIndicator>}
      <SelectItemText>{children}</SelectItemText>
    </BaseSelect.Item>
  );
}

export interface SelectItemIndicatorProps extends Omit<BaseSelect.ItemIndicator.Props, "ref"> {
  ref?: Ref<HTMLSpanElement>;
}

export function SelectItemIndicator({
  children,
  className,
  ref,
  ...props
}: SelectItemIndicatorProps) {
  return (
    <BaseSelect.ItemIndicator
      {...props}
      ref={ref}
      className={mergeClassName<BaseSelect.ItemIndicator.State>(styles.itemIndicator, className)}
    >
      {children ?? <CheckIcon />}
    </BaseSelect.ItemIndicator>
  );
}

export interface SelectItemTextProps extends Omit<BaseSelect.ItemText.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function SelectItemText({ className, ref, ...props }: SelectItemTextProps) {
  return (
    <BaseSelect.ItemText
      {...props}
      ref={ref}
      className={mergeClassName<BaseSelect.ItemText.State>(styles.itemText, className)}
    />
  );
}

export const SelectGroup = BaseSelect.Group;

export interface SelectGroupLabelProps extends Omit<BaseSelect.GroupLabel.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function SelectGroupLabel({ className, ref, ...props }: SelectGroupLabelProps) {
  return (
    <BaseSelect.GroupLabel
      {...props}
      ref={ref}
      className={mergeClassName<BaseSelect.GroupLabel.State>(styles.groupLabel, className)}
    />
  );
}

export interface SelectSeparatorProps extends Omit<BaseSelect.Separator.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function SelectSeparator({ className, ref, ...props }: SelectSeparatorProps) {
  return (
    <BaseSelect.Separator
      {...props}
      ref={ref}
      className={mergeClassName<BaseSelect.Separator.State>(styles.separator, className)}
    />
  );
}

export interface SelectScrollArrowProps extends Omit<BaseSelect.ScrollUpArrow.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function SelectScrollUpArrow({
  children,
  className,
  ref,
  ...props
}: SelectScrollArrowProps) {
  return (
    <BaseSelect.ScrollUpArrow
      {...props}
      ref={ref}
      className={mergeClassName<BaseSelect.ScrollUpArrow.State>(styles.scrollArrow, className)}
    >
      {children ?? <ArrowIcon direction="up" />}
    </BaseSelect.ScrollUpArrow>
  );
}

export function SelectScrollDownArrow({
  children,
  className,
  ref,
  ...props
}: SelectScrollArrowProps) {
  return (
    <BaseSelect.ScrollDownArrow
      {...props}
      ref={ref}
      className={mergeClassName<BaseSelect.ScrollDownArrow.State>(styles.scrollArrow, className)}
    >
      {children ?? <ArrowIcon direction="down" />}
    </BaseSelect.ScrollDownArrow>
  );
}

function CaretIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m3 8 3 3 7-7" />
    </svg>
  );
}

function ArrowIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d={direction === "up" ? "m4 10 4-4 4 4" : "m4 6 4 4 4-4"} />
    </svg>
  );
}
