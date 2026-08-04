import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Textarea } from "./Textarea.tsx";

const META = {
  title: "Components/Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "muted"],
    },
  },
  args: {
    "aria-label": "Message",
    placeholder: "Write your message",
    style: { width: 320 },
  },
} satisfies Meta<typeof Textarea>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const textarea = canvas.getByRole("textbox", { name: "Message" });

    await userEvent.type(textarea, "Hello from Components");
    await expect(textarea).toHaveValue("Hello from Components");
  },
};

export const Muted: Story = {
  args: {
    variant: "muted",
  },
};

export const Invalid: Story = {
  args: {
    "aria-invalid": true,
    defaultValue: "This needs attention.",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: "Disabled",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("textbox", { name: "Message" })).toBeDisabled();
  },
};
