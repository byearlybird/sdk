import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { Ref } from "react";
import { mergeClassName } from "../../utils/mergeClassName.ts";
import type { WithRef } from "../../utils/withRef.ts";
import type { ButtonVariant } from "../Button/Button.tsx";
import buttonStyles from "../Button/Button.module.css";
import styles from "./Dialog.module.css";

export type DialogProps<Payload = unknown> = BaseDialog.Root.Props<Payload>;

export function Dialog<Payload = unknown>(props: DialogProps<Payload>) {
  return <BaseDialog.Root {...props} />;
}

export interface DialogTriggerProps<Payload = unknown> extends Omit<
  BaseDialog.Trigger.Props<Payload>,
  "ref"
> {
  ref?: Ref<HTMLButtonElement>;
}

export function DialogTrigger<Payload = unknown>({
  className,
  ref,
  ...props
}: DialogTriggerProps<Payload>) {
  return (
    <BaseDialog.Trigger
      {...props}
      ref={ref}
      className={mergeClassName<BaseDialog.Trigger.State>(
        [buttonStyles.button, buttonStyles.primary],
        className,
      )}
    />
  );
}

export const DialogPortal = BaseDialog.Portal;

export type DialogBackdropProps = WithRef<BaseDialog.Backdrop.Props, HTMLDivElement>;

export function DialogBackdrop({ className, ref, ...props }: DialogBackdropProps) {
  return (
    <BaseDialog.Backdrop
      {...props}
      ref={ref}
      className={mergeClassName<BaseDialog.Backdrop.State>(styles.backdrop, className)}
    />
  );
}

export type DialogViewportProps = WithRef<BaseDialog.Viewport.Props, HTMLDivElement>;

export function DialogViewport({ className, ref, ...props }: DialogViewportProps) {
  return (
    <BaseDialog.Viewport
      {...props}
      ref={ref}
      className={mergeClassName<BaseDialog.Viewport.State>(styles.viewport, className)}
    />
  );
}

export type DialogPopupProps = WithRef<BaseDialog.Popup.Props, HTMLDivElement>;

export function DialogPopup({ className, ref, ...props }: DialogPopupProps) {
  return (
    <BaseDialog.Popup
      {...props}
      ref={ref}
      className={mergeClassName<BaseDialog.Popup.State>(styles.popup, className)}
    />
  );
}

export interface DialogContentProps extends DialogPopupProps {
  /**
   * Whether to render the default backdrop.
   * @default true
   */
  backdrop?: boolean;
  /**
   * A parent element to render the dialog portal into.
   */
  container?: BaseDialog.Portal.Props["container"];
  /**
   * Whether to keep the dialog mounted while it is closed.
   * @default false
   */
  keepMounted?: boolean;
}

export function DialogContent({
  backdrop = true,
  container,
  keepMounted,
  ...popupProps
}: DialogContentProps) {
  return (
    <DialogPortal container={container} keepMounted={keepMounted}>
      {backdrop ? <DialogBackdrop /> : null}
      <DialogViewport>
        <DialogPopup {...popupProps} />
      </DialogViewport>
    </DialogPortal>
  );
}

export type DialogTitleProps = WithRef<BaseDialog.Title.Props, HTMLHeadingElement>;

export function DialogTitle({ className, ref, ...props }: DialogTitleProps) {
  return (
    <BaseDialog.Title
      {...props}
      ref={ref}
      className={mergeClassName<BaseDialog.Title.State>(styles.title, className)}
    />
  );
}

export type DialogDescriptionProps = WithRef<BaseDialog.Description.Props, HTMLParagraphElement>;

export function DialogDescription({ className, ref, ...props }: DialogDescriptionProps) {
  return (
    <BaseDialog.Description
      {...props}
      ref={ref}
      className={mergeClassName<BaseDialog.Description.State>(styles.description, className)}
    />
  );
}

export interface DialogCloseProps extends WithRef<BaseDialog.Close.Props, HTMLButtonElement> {
  /**
   * Controls the visual prominence of the close button.
   * @default "secondary"
   */
  variant?: ButtonVariant;
}

export function DialogClose({ className, ref, variant = "secondary", ...props }: DialogCloseProps) {
  return (
    <BaseDialog.Close
      {...props}
      ref={ref}
      className={mergeClassName<BaseDialog.Close.State>(
        [buttonStyles.button, buttonStyles[variant]],
        className,
      )}
    />
  );
}
