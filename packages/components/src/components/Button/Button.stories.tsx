import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { expect } from "storybook/test";
import { Button } from "./Button.tsx";
import { ButtonIcon } from "./ButtonIcon.tsx";

const META = {
  title: "Components/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost"],
    },
    size: {
      control: "select",
      options: ["default", "icon"],
    },
  },
  args: {
    children: "Button",
  },
} satisfies Meta<typeof Button>;

export default META;
type Story = StoryObj<typeof META>;

export const Primary: Story = {
  play: async ({ canvas }) => {
    const button = canvas.getByRole("button", { name: "Button" });

    await expect(button).toHaveAttribute("type", "button");
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
  },
};

export const DisabledFocusable: Story = {
  args: {
    children: "Delete",
    disabled: true,
    focusableWhenDisabled: true,
  },
  play: async ({ canvas, userEvent }) => {
    const button = canvas.getByRole("button", { name: "Delete" });

    await expect(button).toHaveAttribute("data-disabled");
    await expect(button).toHaveAttribute("aria-disabled", "true");

    await userEvent.tab();
    await expect(button).toHaveFocus();
  },
};

export const WithLeadingIcon: Story = {
  render: (args) => (
    <Button {...args}>
      <ButtonIcon>
        <PlusIcon />
      </ButtonIcon>
      New
    </Button>
  ),
  play: async ({ canvasElement }) => {
    const icon = canvasElement.querySelector('[data-slot="icon"]');

    await expect(icon).toHaveAttribute("aria-hidden", "true");
    await expect(icon?.querySelector("svg")).toBeInTheDocument();
  },
};

export const WithTrailingIcon: Story = {
  render: (args) => (
    <Button {...args}>
      Continue
      <ButtonIcon>
        <ArrowRightIcon />
      </ButtonIcon>
    </Button>
  ),
};

export const IconOnly: Story = {
  render: (args) => (
    <Button {...args} size="icon" aria-label="Create new">
      <ButtonIcon>
        <PlusIcon />
      </ButtonIcon>
    </Button>
  ),
};
