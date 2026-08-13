import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckIcon } from "@phosphor-icons/react/Check";
import { XIcon } from "@phosphor-icons/react/X";
import { expect } from "storybook/test";
import { ToggleButton } from "./ToggleButton.tsx";

const META = {
  title: "Components/ToggleButton",
  component: ToggleButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    tone: {
      control: "select",
      options: ["neutral", "primary", "accent"],
    },
    size: {
      control: "select",
      options: ["small", "default", "large"],
    },
  },
  args: {
    "aria-label": "Confirm",
    children: <CheckIcon />,
  },
} satisfies Meta<typeof ToggleButton>;

export default META;
type Story = StoryObj<typeof META>;

export const Unselected: Story = {
  args: {
    "aria-label": "Dismiss",
    children: <XIcon />,
  },
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole("button", { name: "Dismiss" });

    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  },
};

export const Neutral: Story = {
  args: {
    defaultPressed: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Confirm" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  },
};

export const Primary: Story = {
  args: {
    defaultPressed: true,
    tone: "primary",
  },
};

export const Accent: Story = {
  args: {
    defaultPressed: true,
    tone: "accent",
  },
};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--eb-size-3)" }}>
      <ToggleButton {...args} defaultPressed size="small" />
      <ToggleButton {...args} defaultPressed size="default" />
      <ToggleButton {...args} defaultPressed size="large" />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    defaultPressed: true,
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Confirm" })).toBeDisabled();
  },
};
