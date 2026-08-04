import type { Meta, StoryObj } from "@storybook/react-vite";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import type { FormEvent } from "react";
import { expect, fn } from "storybook/test";
import { Input } from "./Input.tsx";
import { InputAction } from "./InputAction.tsx";
import { InputGroup } from "./InputGroup.tsx";
import { InputIcon } from "./InputIcon.tsx";

const HANDLE_SUBMIT = fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());

const META = {
  title: "Components/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    "aria-label": "Name",
    name: "name",
    placeholder: "e.g. Ada Lovelace",
    style: { width: 320 },
  },
} satisfies Meta<typeof Input>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Name" });

    await expect(input).toHaveAttribute("name", "name");
    await expect(input).toHaveAttribute("placeholder", "e.g. Ada Lovelace");
  },
};

export const Disabled: Story = {
  args: {
    className: (state) => (state.disabled ? "is-disabled" : undefined),
    disabled: true,
    placeholder: "Disabled",
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Name" });

    await expect(input).toBeDisabled();
    await expect(input).toHaveAttribute("data-disabled");
    await expect(input).toHaveClass("is-disabled");
  },
};

export const Invalid: Story = {
  args: {
    "aria-invalid": true,
    defaultValue: "Invalid value",
  },
};

export const WithIcon: Story = {
  render: () => (
    <InputGroup style={{ width: 320 }}>
      <InputIcon>
        <MagnifyingGlassIcon />
      </InputIcon>
      <Input aria-label="Search" placeholder="Search" />
    </InputGroup>
  ),
  play: async ({ canvasElement }) => {
    const icon = canvasElement.querySelector('[data-slot="icon"]');

    await expect(icon).toHaveAttribute("aria-hidden", "true");
    await expect(icon?.querySelector("svg")).toBeInTheDocument();
  },
};

export const WithAction: Story = {
  render: () => (
    <form onSubmit={HANDLE_SUBMIT}>
      <InputGroup style={{ width: 320 }}>
        <Input aria-label="Search" placeholder="Search" type="search" />
        <InputAction type="submit">Search</InputAction>
      </InputGroup>
    </form>
  ),
  play: async ({ canvas, userEvent }) => {
    const input = canvas.getByRole("searchbox", { name: "Search" });
    const action = canvas.getByRole("button", { name: "Search" });

    await expect(action).toHaveAttribute("data-slot", "action");
    await expect(action).toHaveAttribute("type", "submit");

    await userEvent.type(input, "Storybook");
    await userEvent.click(action);

    await expect(HANDLE_SUBMIT).toHaveBeenCalledOnce();
  },
};
