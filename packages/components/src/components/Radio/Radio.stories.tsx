import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Radio, RadioGroup } from "./Radio.tsx";

function ExampleRadioGroup({ disabled = false }: { disabled?: boolean }) {
  const options = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Never", value: "never" },
  ];

  return (
    <RadioGroup
      aria-label="Email frequency"
      defaultValue="weekly"
      disabled={disabled}
      name="frequency"
      style={{
        padding: "var(--size-4)",
        borderRadius: "var(--components-radius-surface)",
        background: "var(--components-color-background)",
      }}
    >
      {options.map((option) => (
        <label
          key={option.value}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--size-2)",
            lineHeight: "var(--line-normal)",
          }}
        >
          <Radio value={option.value} />
          {option.label}
        </label>
      ))}
    </RadioGroup>
  );
}

const META = {
  title: "Components/Radio",
  component: RadioGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  render: () => <ExampleRadioGroup />,
} satisfies Meta<typeof RadioGroup>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas, userEvent }) => {
    const weekly = canvas.getByRole("radio", { name: "Weekly" });
    const daily = canvas.getByRole("radio", { name: "Daily" });

    await expect(weekly).toBeChecked();
    await userEvent.click(daily);
    await expect(daily).toBeChecked();
    await expect(weekly).not.toBeChecked();
  },
};

export const Disabled: Story = {
  render: () => <ExampleRadioGroup disabled />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("radio", { name: "Daily" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  },
};
