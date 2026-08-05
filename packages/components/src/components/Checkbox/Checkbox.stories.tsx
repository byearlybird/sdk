import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Checkbox } from "./Checkbox.tsx";

function ExampleCheckbox({
  disabled = false,
  indeterminate = false,
}: {
  disabled?: boolean;
  indeterminate?: boolean;
}) {
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
      <Checkbox
        defaultChecked={!indeterminate}
        disabled={disabled}
        indeterminate={indeterminate}
        name="notifications"
      />
      Enable notifications
    </label>
  );
}

const META = {
  title: "Components/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  render: () => <ExampleCheckbox />,
} satisfies Meta<typeof Checkbox>;

export default META;
type Story = StoryObj<typeof META>;

export const Checked: Story = {
  play: async ({ canvas, userEvent }) => {
    const checkbox = canvas.getByRole("checkbox", { name: "Enable notifications" });

    await expect(checkbox).toBeChecked();
    await userEvent.click(checkbox);
    await expect(checkbox).not.toBeChecked();
  },
};

export const Indeterminate: Story = {
  render: () => <ExampleCheckbox indeterminate />,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("checkbox", { name: "Enable notifications" }),
    ).toBePartiallyChecked();
  },
};

export const Disabled: Story = {
  render: () => <ExampleCheckbox disabled />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("checkbox", { name: "Enable notifications" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};
