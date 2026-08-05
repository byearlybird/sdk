import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ReactNode, Ref } from "react";
import { mergeClassName } from "../../utils/mergeClassName.ts";
import type { WithRef } from "../../utils/withRef.ts";
import { CheckIcon } from "../icons.tsx";
import type { ButtonSize } from "../Button/Button.tsx";
import buttonStyles from "../Button/Button.module.css";
import styles from "./Menu.module.css";

export type MenuProps<Payload = unknown> = BaseMenu.Root.Props<Payload>;

export function Menu<Payload = unknown>(props: MenuProps<Payload>) {
  return <BaseMenu.Root {...props} />;
}

export type MenuSubmenuProps = BaseMenu.SubmenuRoot.Props;

export function MenuSubmenu(props: MenuSubmenuProps) {
  return <BaseMenu.SubmenuRoot {...props} />;
}

export interface MenuTriggerProps<Payload = unknown> extends Omit<
  BaseMenu.Trigger.Props<Payload>,
  "ref"
> {
  ref?: Ref<HTMLButtonElement>;
  /**
   * Controls whether the trigger uses its default layout or a square icon layout.
   * Provide an accessible name with `aria-label` when using `"icon"`.
   * @default "default"
   */
  size?: ButtonSize;
}

export function MenuTrigger<Payload = unknown>({
  className,
  ref,
  size = "default",
  ...props
}: MenuTriggerProps<Payload>) {
  return (
    <BaseMenu.Trigger
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.Trigger.State>(
        [
          buttonStyles.button,
          buttonStyles.secondary,
          size === "icon" ? buttonStyles.iconSize : undefined,
          styles.trigger,
        ],
        className,
      )}
    />
  );
}

export const MenuPortal = BaseMenu.Portal;

export type MenuBackdropProps = WithRef<BaseMenu.Backdrop.Props, HTMLDivElement>;

export function MenuBackdrop({ className, ref, ...props }: MenuBackdropProps) {
  return (
    <BaseMenu.Backdrop
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.Backdrop.State>(styles.backdrop, className)}
    />
  );
}

export type MenuPositionerProps = WithRef<BaseMenu.Positioner.Props, HTMLDivElement>;

export function MenuPositioner({ className, ref, sideOffset = 8, ...props }: MenuPositionerProps) {
  return (
    <BaseMenu.Positioner
      {...props}
      ref={ref}
      sideOffset={sideOffset}
      className={mergeClassName<BaseMenu.Positioner.State>(styles.positioner, className)}
    />
  );
}

export type MenuPopupProps = WithRef<BaseMenu.Popup.Props, HTMLDivElement>;

export function MenuPopup({ className, ref, ...props }: MenuPopupProps) {
  return (
    <BaseMenu.Popup
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.Popup.State>(styles.popup, className)}
    />
  );
}

export interface MenuContentProps extends MenuPopupProps {
  align?: MenuPositionerProps["align"];
  alignOffset?: MenuPositionerProps["alignOffset"];
  container?: BaseMenu.Portal.Props["container"];
  keepMounted?: BaseMenu.Portal.Props["keepMounted"];
  side?: MenuPositionerProps["side"];
  sideOffset?: MenuPositionerProps["sideOffset"];
}

export function MenuContent({
  align,
  alignOffset,
  container,
  keepMounted,
  side,
  sideOffset,
  ...popupProps
}: MenuContentProps) {
  return (
    <MenuPortal container={container} keepMounted={keepMounted}>
      <MenuPositioner align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset}>
        <MenuPopup {...popupProps} />
      </MenuPositioner>
    </MenuPortal>
  );
}

export type MenuArrowProps = WithRef<BaseMenu.Arrow.Props, HTMLDivElement>;

export function MenuArrow({ className, ref, ...props }: MenuArrowProps) {
  return (
    <BaseMenu.Arrow
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.Arrow.State>(styles.arrow, className)}
    />
  );
}

export type MenuItemProps = WithRef<BaseMenu.Item.Props, HTMLElement>;

export function MenuItem({ className, ref, ...props }: MenuItemProps) {
  return (
    <BaseMenu.Item
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.Item.State>(styles.item, className)}
    />
  );
}

export type MenuLinkItemProps = WithRef<BaseMenu.LinkItem.Props, Element>;

export function MenuLinkItem({ className, ref, ...props }: MenuLinkItemProps) {
  return (
    <BaseMenu.LinkItem
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.LinkItem.State>([styles.item, styles.linkItem], className)}
    />
  );
}

export type MenuSubmenuTriggerProps = WithRef<BaseMenu.SubmenuTrigger.Props, HTMLElement>;

export function MenuSubmenuTrigger({ className, ref, ...props }: MenuSubmenuTriggerProps) {
  return (
    <BaseMenu.SubmenuTrigger
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.SubmenuTrigger.State>(
        [styles.item, styles.submenuTrigger],
        className,
      )}
    />
  );
}

export const MenuGroup = BaseMenu.Group;

export type MenuGroupLabelProps = WithRef<BaseMenu.GroupLabel.Props, HTMLDivElement>;

export function MenuGroupLabel({ className, ref, ...props }: MenuGroupLabelProps) {
  return (
    <BaseMenu.GroupLabel
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.GroupLabel.State>(styles.groupLabel, className)}
    />
  );
}

export type MenuSeparatorProps = WithRef<BaseMenu.Separator.Props, HTMLDivElement>;

export function MenuSeparator({ className, ref, ...props }: MenuSeparatorProps) {
  return (
    <BaseMenu.Separator
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.Separator.State>(styles.separator, className)}
    />
  );
}

export interface MenuCheckboxItemProps extends Omit<
  BaseMenu.CheckboxItem.Props,
  "children" | "ref"
> {
  children: ReactNode;
  ref?: Ref<HTMLElement>;
  /**
   * Replaces the default checkmark. Pass `null` to hide the indicator.
   */
  indicator?: ReactNode;
}

export function MenuCheckboxItem({
  children,
  className,
  indicator,
  ref,
  ...props
}: MenuCheckboxItemProps) {
  return (
    <BaseMenu.CheckboxItem
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.CheckboxItem.State>(
        [styles.item, styles.selectionItem],
        className,
      )}
    >
      {indicator === null ? null : (
        <MenuCheckboxItemIndicator>{indicator}</MenuCheckboxItemIndicator>
      )}
      {children}
    </BaseMenu.CheckboxItem>
  );
}

export type MenuCheckboxItemIndicatorProps = WithRef<
  BaseMenu.CheckboxItemIndicator.Props,
  HTMLSpanElement
>;

export function MenuCheckboxItemIndicator({
  children,
  className,
  ref,
  ...props
}: MenuCheckboxItemIndicatorProps) {
  return (
    <BaseMenu.CheckboxItemIndicator
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.CheckboxItemIndicator.State>(
        [styles.itemIndicator],
        className,
      )}
    >
      {children ?? <CheckIcon />}
    </BaseMenu.CheckboxItemIndicator>
  );
}

export const MenuRadioGroup = BaseMenu.RadioGroup;

export interface MenuRadioItemProps extends Omit<BaseMenu.RadioItem.Props, "children" | "ref"> {
  children: ReactNode;
  ref?: Ref<HTMLElement>;
}

export function MenuRadioItem({ children, className, ref, ...props }: MenuRadioItemProps) {
  return (
    <BaseMenu.RadioItem
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.RadioItem.State>(
        [styles.item, styles.selectionItem],
        className,
      )}
    >
      <MenuRadioItemIndicator />
      {children}
    </BaseMenu.RadioItem>
  );
}

export type MenuRadioItemIndicatorProps = WithRef<
  BaseMenu.RadioItemIndicator.Props,
  HTMLSpanElement
>;

export function MenuRadioItemIndicator({ className, ref, ...props }: MenuRadioItemIndicatorProps) {
  return (
    <BaseMenu.RadioItemIndicator
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.RadioItemIndicator.State>(
        [styles.itemIndicator, styles.radioIndicator],
        className,
      )}
    />
  );
}

export type MenuViewportProps = WithRef<BaseMenu.Viewport.Props, HTMLDivElement>;

export function MenuViewport({ className, ref, ...props }: MenuViewportProps) {
  return (
    <BaseMenu.Viewport
      {...props}
      ref={ref}
      className={mergeClassName<BaseMenu.Viewport.State>(styles.viewport, className)}
    />
  );
}
