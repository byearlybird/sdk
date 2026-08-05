import { Combobox as BaseCombobox } from "@base-ui/react/combobox";
import { clsx } from "clsx";
import type { ComponentPropsWithRef, ReactNode, Ref } from "react";
import { mergeClassName } from "../../utils/mergeClassName.ts";
import type { WithRef } from "../../utils/withRef.ts";
import { CaretIcon, CheckIcon } from "../icons.tsx";
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

export type ComboboxInputGroupProps = WithRef<BaseCombobox.InputGroup.Props, HTMLDivElement>;

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

export type ComboboxInputProps = WithRef<BaseCombobox.Input.Props, HTMLInputElement>;

export function ComboboxInput({ className, ref, ...props }: ComboboxInputProps) {
  return (
    <BaseCombobox.Input
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Input.State>(styles.input, className)}
    />
  );
}

export type ComboboxClearProps = WithRef<BaseCombobox.Clear.Props, HTMLButtonElement>;

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

export type ComboboxTriggerProps = WithRef<BaseCombobox.Trigger.Props, HTMLButtonElement>;

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

export type ComboboxIconProps = WithRef<BaseCombobox.Icon.Props, HTMLSpanElement>;

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

export type ComboboxBackdropProps = WithRef<BaseCombobox.Backdrop.Props, HTMLDivElement>;

export function ComboboxBackdrop({ className, ref, ...props }: ComboboxBackdropProps) {
  return (
    <BaseCombobox.Backdrop
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Backdrop.State>(styles.backdrop, className)}
    />
  );
}

export type ComboboxPositionerProps = WithRef<BaseCombobox.Positioner.Props, HTMLDivElement>;

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

export type ComboboxPopupProps = WithRef<BaseCombobox.Popup.Props, HTMLDivElement>;

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

export type ComboboxArrowProps = WithRef<BaseCombobox.Arrow.Props, HTMLDivElement>;

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

export type ComboboxListProps = WithRef<BaseCombobox.List.Props, HTMLDivElement>;

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

export type ComboboxItemIndicatorProps = WithRef<BaseCombobox.ItemIndicator.Props, HTMLSpanElement>;

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

export type ComboboxEmptyProps = WithRef<BaseCombobox.Empty.Props, HTMLDivElement>;

export function ComboboxEmpty({ className, ref, ...props }: ComboboxEmptyProps) {
  return (
    <BaseCombobox.Empty
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Empty.State>(styles.empty, className)}
    />
  );
}

export type ComboboxStatusProps = WithRef<BaseCombobox.Status.Props, HTMLDivElement>;

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

export type ComboboxGroupLabelProps = WithRef<BaseCombobox.GroupLabel.Props, HTMLDivElement>;

export function ComboboxGroupLabel({ className, ref, ...props }: ComboboxGroupLabelProps) {
  return (
    <BaseCombobox.GroupLabel
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.GroupLabel.State>(styles.groupLabel, className)}
    />
  );
}

export type ComboboxSeparatorProps = WithRef<BaseCombobox.Separator.Props, HTMLDivElement>;

export function ComboboxSeparator({ className, ref, ...props }: ComboboxSeparatorProps) {
  return (
    <BaseCombobox.Separator
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Separator.State>(styles.separator, className)}
    />
  );
}

export type ComboboxChipsProps = WithRef<BaseCombobox.Chips.Props, HTMLDivElement>;

export function ComboboxChips({ className, ref, ...props }: ComboboxChipsProps) {
  return (
    <BaseCombobox.Chips
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Chips.State>(styles.chips, className)}
    />
  );
}

export type ComboboxChipProps = WithRef<BaseCombobox.Chip.Props, HTMLDivElement>;

export function ComboboxChip({ className, ref, ...props }: ComboboxChipProps) {
  return (
    <BaseCombobox.Chip
      {...props}
      ref={ref}
      className={mergeClassName<BaseCombobox.Chip.State>(styles.chip, className)}
    />
  );
}

export type ComboboxChipRemoveProps = WithRef<BaseCombobox.ChipRemove.Props, HTMLButtonElement>;

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

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="m4 4 8 8m0-8-8 8" />
    </svg>
  );
}
