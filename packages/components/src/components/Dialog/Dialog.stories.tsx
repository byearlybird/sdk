import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { Button } from "../Button/Button.tsx";
import { Input } from "../Input/Input.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./Dialog.tsx";

function ExampleDialog() {
  return (
    <Dialog>
      <DialogTrigger>Edit profile</DialogTrigger>
      <DialogContent>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>
          Make changes to your public profile, then save when you are finished.
        </DialogDescription>
        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          <Input aria-label="Display name" defaultValue="Ada Lovelace" />
          <Input aria-label="Username" defaultValue="ada" name="username" placeholder="Username" />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <DialogClose>Cancel</DialogClose>
          <Button>Save changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const META = {
  title: "Components/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  render: () => <ExampleDialog />,
} satisfies Meta<typeof Dialog>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit profile" }));

    const page = within(canvasElement.ownerDocument.body);
    const popup = await page.findByRole("dialog", { name: "Edit profile" });

    await waitFor(() => expect(popup).toBeVisible());
    await expect(page.getByRole("textbox", { name: "Display name" })).toHaveValue("Ada Lovelace");

    await userEvent.click(page.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Edit profile" })).not.toBeInTheDocument(),
    );
  },
};
