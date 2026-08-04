import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import type { Ref } from "react";
import { mergeClassName } from "../../utils/mergeClassName.ts";
import buttonStyles from "../Button/Button.module.css";
import styles from "./Drawer.module.css";

export type DrawerProps<Payload = unknown> = BaseDrawer.Root.Props<Payload>;

export function Drawer<Payload = unknown>(props: DrawerProps<Payload>) {
  return <BaseDrawer.Root {...props} />;
}

export const DrawerProvider = BaseDrawer.Provider;
export const DrawerIndentBackground = BaseDrawer.IndentBackground;
export const DrawerIndent = BaseDrawer.Indent;

export interface DrawerTriggerProps<Payload = unknown> extends Omit<
  BaseDrawer.Trigger.Props<Payload>,
  "ref"
> {
  ref?: Ref<HTMLButtonElement>;
}

export function DrawerTrigger<Payload = unknown>({
  className,
  ref,
  ...props
}: DrawerTriggerProps<Payload>) {
  return (
    <BaseDrawer.Trigger
      {...props}
      ref={ref}
      className={mergeClassName<BaseDrawer.Trigger.State>(
        [buttonStyles.button, buttonStyles.primary],
        className,
      )}
    />
  );
}

export const DrawerSwipeArea = BaseDrawer.SwipeArea;
export const DrawerVirtualKeyboardProvider = BaseDrawer.VirtualKeyboardProvider;
export const DrawerPortal = BaseDrawer.Portal;

export interface DrawerBackdropProps extends Omit<BaseDrawer.Backdrop.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function DrawerBackdrop({ className, ref, ...props }: DrawerBackdropProps) {
  return (
    <BaseDrawer.Backdrop
      {...props}
      ref={ref}
      className={mergeClassName<BaseDrawer.Backdrop.State>(styles.backdrop, className)}
    />
  );
}

export interface DrawerViewportProps extends Omit<BaseDrawer.Viewport.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function DrawerViewport({ className, ref, ...props }: DrawerViewportProps) {
  return (
    <BaseDrawer.Viewport
      {...props}
      ref={ref}
      className={mergeClassName<BaseDrawer.Viewport.State>(styles.viewport, className)}
    />
  );
}

export interface DrawerPopupProps extends Omit<BaseDrawer.Popup.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
}

export function DrawerPopup({ className, ref, ...props }: DrawerPopupProps) {
  return (
    <BaseDrawer.Popup
      {...props}
      ref={ref}
      className={mergeClassName<BaseDrawer.Popup.State>(styles.popup, className)}
    />
  );
}

export interface DrawerContentProps extends Omit<BaseDrawer.Content.Props, "ref"> {
  ref?: Ref<HTMLDivElement>;
  /**
   * Whether to render the default backdrop.
   * @default true
   */
  backdrop?: boolean;
  /**
   * A parent element to render the drawer portal into.
   */
  container?: BaseDrawer.Portal.Props["container"];
  /**
   * Determines the element to focus when the drawer is closed.
   */
  finalFocus?: BaseDrawer.Popup.Props["finalFocus"];
  /**
   * Determines the element to focus when the drawer is opened.
   */
  initialFocus?: BaseDrawer.Popup.Props["initialFocus"];
  /**
   * Whether to keep the drawer mounted while it is closed.
   * @default false
   */
  keepMounted?: boolean;
  /**
   * Whether to render a grip outside the selectable content that can initiate
   * swipe gestures with either a mouse or touch input.
   * @default false
   */
  swipeHandle?: boolean;
}

export function DrawerContent({
  backdrop = true,
  className,
  container,
  finalFocus,
  initialFocus,
  keepMounted,
  ref,
  swipeHandle = false,
  ...contentProps
}: DrawerContentProps) {
  return (
    <DrawerPortal container={container} keepMounted={keepMounted}>
      {backdrop ? <DrawerBackdrop /> : null}
      <DrawerViewport>
        <DrawerPopup finalFocus={finalFocus} initialFocus={initialFocus}>
          {swipeHandle ? <div aria-hidden="true" className={styles.swipeHandle} /> : null}
          <BaseDrawer.Content
            {...contentProps}
            ref={ref}
            className={mergeClassName<BaseDrawer.Content.State>(styles.content, className)}
          />
        </DrawerPopup>
      </DrawerViewport>
    </DrawerPortal>
  );
}

export interface DrawerTitleProps extends Omit<BaseDrawer.Title.Props, "ref"> {
  ref?: Ref<HTMLHeadingElement>;
}

export function DrawerTitle({ className, ref, ...props }: DrawerTitleProps) {
  return (
    <BaseDrawer.Title
      {...props}
      ref={ref}
      className={mergeClassName<BaseDrawer.Title.State>(styles.title, className)}
    />
  );
}

export interface DrawerDescriptionProps extends Omit<BaseDrawer.Description.Props, "ref"> {
  ref?: Ref<HTMLParagraphElement>;
}

export function DrawerDescription({ className, ref, ...props }: DrawerDescriptionProps) {
  return (
    <BaseDrawer.Description
      {...props}
      ref={ref}
      className={mergeClassName<BaseDrawer.Description.State>(styles.description, className)}
    />
  );
}

export interface DrawerCloseProps extends Omit<BaseDrawer.Close.Props, "ref"> {
  ref?: Ref<HTMLButtonElement>;
}

export function DrawerClose({ className, ref, ...props }: DrawerCloseProps) {
  return (
    <BaseDrawer.Close
      {...props}
      ref={ref}
      className={mergeClassName<BaseDrawer.Close.State>(
        [buttonStyles.button, buttonStyles.secondary],
        className,
      )}
    />
  );
}
