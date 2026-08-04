import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { clsx } from "clsx";
import type { ComponentPropsWithRef, ReactNode, Ref } from "react";
import { mergeClassName } from "../../utils/mergeClassName.ts";
import styles from "./Combobox.module.css";

export type ComboboxProps<
  Value,
  Multiple extends boolean | undefined = false,
> = BaseCombobox.Root.Props<Value, Multiple>;

export function Combobox<Value, Multiple extends boolean | undefined = false>(
  props: ComboboxProps<Value, Multiple>,
) {
  return <BaseCombobox.Root {...props} />;
}

export type ComboboxLabelProps = ComponentPropsWithRef<"label">;

export function ComboboxLabel({ className, ref, ...props }: ComboboxLabelProps) {
  return <label {...props} ref={ref} className={clsx(styles.label, className)} />;
}

export interface ComboboxInputGroupProps extends Omit<BaseCombobox.InputGroup.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function ComboboxInputGroup({ className, ref, ...props }: ComboboxInputGroupProps) {
  return (
    <BaseCombobox.InputGroup
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.InputGroup.State>(styles.inputGroup, className)}
    />
  );
}

export type ComboboxLeadingIconProps = ComponentPropsWithRef<"span">;

export function ComboboxLeadingIcon({ children, className, ...props }: ComboboxLeadingIconProps) {
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

export interface ComboboxInputProps extends Omit<BaseCombobox.Input.Props, "ref"> {
  ref?: Ref<HTMLInputElement>;
}

export function ComboboxInput({ className, ref, ...props }: ComboboxInputProps) {
  return (
    <BaseCombobox.Input
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Input.State>(styles.input, className)}
    />
  );
}

export interface ComboboxClearProps extends Omit<BaseCombobox.Clear.Props, "ref"> {
  ref?: Ref<HTMLButtonElement>;
}

export function ComboboxClear({
  "aria-label": ariaLabel = "Clear selection",
  children,
  className,
  ref,
  ...props
}: ComboboxClearProps) {
  return (
    <BaseCombobox.Clear
      {...props}
      ref={ref}
      aria-label={ariaLabel}
      className={mergeClassName<BaseCombobox.Clear.State>(styles.clear, className)}
    >
      {children ?? <CloseIcon />}
    </BaseCombobox.Clear>
  );
}

export interface ComboboxTriggerProps extends Omit<BaseCombobox.Trigger.Props, "ref"> {
  ref?: Ref<HTMLButtonElement>;
}

export function ComboboxTrigger({
  "aria-label": ariaLabel = "Show options",
  children,
  className,
  ref,
  ...props
}: ComboboxTriggerProps) {
  return (
    <BaseCombobox.Trigger
      {...props}
      ref={ref}
      aria-label={ariaLabel}
      className={mergeClassName<BaseCombobox.Trigger.State>(styles.trigger, className)}
    >
      {children ?? <CaretIcon />}
    </BaseCombobox.Trigger>
  );
}

export interface ComboboxIconProps extends Omit<BaseCombobox.Icon.Props, "ref"> {
  ref?: Ref<HTMLSpanElement>;
}

export function ComboboxIcon({ children, className, ref, ...props }: ComboboxIconProps) {
  return (
    <BaseCombobox.Icon
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Icon.State>(styles.icon, className)}
    >
      {children ?? <CaretIcon />}
    </BaseCombobox.Icon>
  );
}

export const ComboboxValue = BaseCombobox.Value;
export const ComboboxPortal = BaseCombobox.Portal;

export interface ComboboxBackdropProps extends Omit<BaseCombobox.Backdrop.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function ComboboxBackdrop({ className, ref, ...props }: ComboboxBackdropProps) {
  return (
    <BaseCombobox.Backdrop
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Backdrop.State>(styles.backdrop, className)}
    />
  );
}

export interface ComboboxPositionerProps extends Omit<BaseCombobox.Positioner.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function ComboboxPositioner({
  className,
  ref,
  sideOffset = 8,
  ...props
}: ComboboxPositionerProps) {
  return (
    <BaseCombobox.Positioner
      {...props}
      ref={ref}
      sideOffset={sideOffset}
      className={mergeClassName<BaseCombobox.Positioner.State>(styles.positioner, className)}
    />
  );
}

export interface ComboboxPopupProps extends Omit<BaseCombobox.Popup.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function ComboboxPopup({ className, ref, ...props }: ComboboxPopupProps) {
  return (
    <BaseCombobox.Popup
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Popup.State>(styles.popup, className)}
    />
  );
}

export interface ComboboxContentProps extends ComboboxPopupProps {
  align?: ComboboxPositionerProps["align"];
  alignOffset?: ComboboxPositionerProps["alignOffset"];
  container?: BaseCombobox.Portal.Props["container"];
  keepMounted?: BaseCombobox.Portal.Props["keepMounted"];
  side?: ComboboxPositionerProps["side"];
  sideOffset?: ComboboxPositionerProps["sideOffset"];
}

export function ComboboxContent({
  align,
  alignOffset,
  container,
  keepMounted,
  side,
  sideOffset,
  ...popupProps
}: ComboboxContentProps) {
  return (
    <ComboboxPortal container={container} keepMounted={keepMounted}>
      <ComboboxPositioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <ComboboxPopup {...popupProps} />
      </ComboboxPositioner>
    </ComboboxPortal>
  );
}

export interface ComboboxArrowProps extends Omit<BaseCombobox.Arrow.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function ComboboxArrow({ children, className, ref, ...props }: ComboboxArrowProps) {
  return (
    <BaseCombobox.Arrow
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Arrow.State>(styles.arrow, className)}
    >
      {children ?? <span className={styles.arrowShape} />}
    </BaseCombobox.Arrow>
  );
}

export interface ComboboxListProps extends Omit<BaseCombobox.List.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function ComboboxList({ className, ref, ...props }: ComboboxListProps) {
  return (
    <BaseCombobox.List
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.List.State>(styles.list, className)}
    />
  );
}

export interface ComboboxItemProps extends Omit<BaseCombobox.Item.Props, "children" | "ref"> {
  children: ReactNode;
  ref?: Ref<HTMLDivElement>;
  /**
   * Replaces the default checkmark. Pass `null` to hide the indicator.
   */
  indicator?: ReactNode;
}

export function ComboboxItem({ children, className, indicator, ref, ...props }: ComboboxItemProps) {
  return (
    <BaseCombobox.Item
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Item.State>(styles.item, className)}
    >
      {indicator === null ? null : <ComboboxItemIndicator>{indicator}</ComboboxItemIndicator>}
      <ComboboxItemText>{children}</ComboboxItemText>
    </BaseCombobox.Item>
  );
}

export interface ComboboxItemIndicatorProps extends Omit<BaseCombobox.ItemIndicator.Props, "ref"> {
  ref?: Ref<HTMLSpanElement>;
}

export function ComboboxItemIndicator({
  children,
  className,
  ref,
  ...props
}: ComboboxItemIndicatorProps) {
  return (
    <BaseCombobox.ItemIndicator
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.ItemIndicator.State>(styles.itemIndicator, className)}
    >
      {children ?? <CheckIcon />}
    </BaseCombobox.ItemIndicator>
  );
}

export type ComboboxItemTextProps = ComponentPropsWithRef<"span">;

export function ComboboxItemText({ className, ref, ...props }: ComboboxItemTextProps) {
  return <span {...props} ref={ref} className={clsx(styles.itemText, className)} />;
}

export interface ComboboxEmptyProps extends Omit<BaseCombobox.Empty.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function ComboboxEmpty({ className, ref, ...props }: ComboboxEmptyProps) {
  return (
    <BaseCombobox.Empty
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Empty.State>(styles.empty, className)}
    />
  );
}

export interface ComboboxStatusProps extends Omit<BaseCombobox.Status.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function ComboboxStatus({ className, ref, ...props }: ComboboxStatusProps) {
  return (
    <BaseCombobox.Status
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Status.State>(styles.status, className)}
    />
  );
}

export const ComboboxCollection = BaseCombobox.Collection;
export const ComboboxGroup = BaseCombobox.Group;
export const ComboboxRow = BaseCombobox.Row;

export interface ComboboxGroupLabelProps extends Omit<BaseCombobox.GroupLabel.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function ComboboxGroupLabel({ className, ref, ...props }: ComboboxGroupLabelProps) {
  return (
    <BaseCombobox.GroupLabel
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.GroupLabel.State>(styles.groupLabel, className)}
    />
  );
}

export interface ComboboxSeparatorProps extends Omit<BaseCombobox.Separator.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function ComboboxSeparator({ className, ref, ...props }: ComboboxSeparatorProps) {
  return (
    <BaseCombobox.Separator
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Separator.State>(styles.separator, className)}
    />
  );
}

export interface ComboboxChipsProps extends Omit<BaseCombobox.Chips.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function ComboboxChips({ className, ref, ...props }: ComboboxChipsProps) {
  return (
    <BaseCombobox.Chips
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Chips.State>(styles.chips, className)}
    />
  );
}

export interface ComboboxChipProps extends Omit<BaseCombobox.Chip.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function ComboboxChip({ className, ref, ...props }: ComboboxChipProps) {
  return (
    <BaseCombobox.Chip
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Chip.State>(styles.chip, className)}
    />
  );
}

export interface ComboboxChipRemoveProps extends Omit<BaseCombobox.ChipRemove.Props, "ref"> {
  ref?: Ref<HTMLButtonElement>;
}

export function ComboboxChipRemove({
  "aria-label": ariaLabel = "Remove",
  children,
  className,
  ref,
  ...props
}: ComboboxChipRemoveProps) {
  return (
    <BaseCombobox.ChipRemove
      {...props}
      ref={ref}
      aria-label={ariaLabel}
      className={mergeClassName<BaseCombobox.ChipRemove.State>(styles.chipRemove, className)}
    >
      {children ?? <CloseIcon />}
    </BaseCombobox.ChipRemove>
  );
}

function CaretIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m3 8 3 3 7-7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m4 4 8 8m0-8-8 8" />
    </svg>
  );
}
