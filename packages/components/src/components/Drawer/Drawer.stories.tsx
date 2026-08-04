import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { Button } from "../Button/Button.tsx";
import { Input } from "../Input/Input.tsx";
import { Textarea } from "../Textarea/Textarea.tsx";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "./Drawer.tsx";
import type { DrawerProps } from "./Drawer.tsx";

function ExampleDrawer({
  swipeDirection = "right",
  swipeHandle = false,
}: Pick<DrawerProps, "swipeDirection"> & { swipeHandle?: boolean }) {
  return (
    <Drawer swipeDirection={swipeDirection}>
      <DrawerTrigger>Account settings</DrawerTrigger>
      <DrawerContent swipeHandle={swipeHandle} style={{ display: "flex", flexDirection: "column" }}>
        <DrawerTitle>Account settings</DrawerTitle>
        <DrawerDescription>Update the details associated with your account.</DrawerDescription>
        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          <Input aria-label="Email address" defaultValue="ada@example.com" />
          <Textarea aria-label="Bio" defaultValue="Mathematician and computing pioneer." />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: "auto",
            paddingTop: 16,
          }}
        >
          <DrawerClose>Cancel</DrawerClose>
          <Button>Save changes</Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

const META = {
  title: "Components/Drawer",
  component: Drawer,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  render: () => <ExampleDrawer />,
} satisfies Meta<typeof Drawer>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Account settings" }));

    const page = within(canvasElement.ownerDocument.body);
    const popup = await page.findByRole("dialog", { name: "Account settings" });

    await expect(popup).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email address" })).toHaveValue(
      "ada@example.com",
    );

    await userEvent.click(page.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Account settings" })).not.toBeInTheDocument(),
    );
  },
};

export const SwipeableFromBottom: Story = {
  render: () => <ExampleDrawer swipeDirection="down" swipeHandle />,
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Account settings" }));

    const page = within(canvasElement.ownerDocument.body);
    const dialog = await page.findByRole("dialog", {
      name: "Account settings",
    });
    const popup = dialog.closest('[data-swipe-direction="down"]');

    await expect(popup).toBeInTheDocument();
  },
};
