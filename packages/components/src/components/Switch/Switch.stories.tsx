import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Switch } from "./Switch.tsx";

function ExampleSwitch({ disabled = false }: { disabled?: boolean }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--size-2)",
        color: "var(--eb-color-text)",
        background: "var(--eb-color-background)",
        padding: "var(--size-4)",
        borderRadius: "var(--eb-radius-surface)",
        fontFamily: "var(--eb-font-family)",
        fontSize: "var(--scale-00)",
      }}
    >
      <Switch defaultChecked disabled={disabled} name="compact-mode" />
      Compact mode
    </label>
  );
}

const META = {
  title: "Components/Switch",
  component: Switch,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  render: () => <ExampleSwitch />,
} satisfies Meta<typeof Switch>;

export default META;
type Story = StoryObj<typeof META>;

export const Checked: Story = {
  play: async ({ canvas, userEvent }) => {
    const control = canvas.getByRole("switch", { name: "Compact mode" });

    await expect(control).toBeChecked();
    await userEvent.click(control);
    await expect(control).not.toBeChecked();
  },
};

export const Disabled: Story = {
  render: () => <ExampleSwitch disabled />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("switch", { name: "Compact mode" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};
