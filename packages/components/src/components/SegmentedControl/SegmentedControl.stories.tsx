import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { SegmentedControl, SegmentedControlItem } from "./SegmentedControl.tsx";

const META = {
  title: "Components/SegmentedControl",
  component: SegmentedControl,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["default", "large"],
    },
    variant: {
      control: "select",
      options: ["neutral", "primary"],
    },
  },
  render: (args) => (
    <SegmentedControl {...args}>
      <SegmentedControlItem value="all">All</SegmentedControlItem>
      <SegmentedControlItem value="pinned">Pinned</SegmentedControlItem>
    </SegmentedControl>
  ),
  args: {
    "aria-label": "Filter",
    defaultValue: ["all"],
  },
} satisfies Meta<typeof SegmentedControl>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "All" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(canvas.getByRole("button", { name: "Pinned" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  },
};

export const Primary: Story = {
  args: {
    variant: "primary",
  },
};

export const LargeFullWidth: Story = {
  args: {
    defaultValue: ["incomplete"],
    fullWidth: true,
    size: "large",
    variant: "primary",
  },
  render: (args) => (
    <div style={{ width: 340 }}>
      <SegmentedControl {...args}>
        <SegmentedControlItem value="incomplete">Incomplete</SegmentedControlItem>
        <SegmentedControlItem value="complete">Complete</SegmentedControlItem>
        <SegmentedControlItem value="canceled">Canceled</SegmentedControlItem>
      </SegmentedControl>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "All" })).toBeDisabled();
  },
};
