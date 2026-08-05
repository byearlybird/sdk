import type { Meta, StoryObj } from "@storybook/react-vite";
import { OrangeIcon } from "@phosphor-icons/react/Orange";
import { expect, waitFor, within } from "storybook/test";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectLeadingIcon,
  SelectList,
  SelectTrigger,
  SelectValue,
} from "./Select.tsx";

const FRUITS = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Mango", value: "mango" },
  { label: "Orange", value: "orange" },
];

function ExampleSelect({ disabled = false }: { disabled?: boolean }) {
  return (
    <div
      style={{
        width: 280,
        padding: 16,
        background: "var(--eb-color-background)",
        borderRadius: "var(--eb-radius-surface)",
      }}
    >
      <Select items={FRUITS} disabled={disabled}>
        <SelectLabel>Fruit</SelectLabel>
        <SelectTrigger>
          <SelectLeadingIcon>
            <OrangeIcon />
          </SelectLeadingIcon>
          <SelectValue placeholder="Select a fruit" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectList aria-label="Fruit">
            {FRUITS.map((fruit) => (
              <SelectItem key={fruit.value} value={fruit.value}>
                {fruit.label}
              </SelectItem>
            ))}
          </SelectList>
        </SelectContent>
      </Select>
    </div>
  );
}

const META = {
  title: "Components/Select",
  component: Select,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  render: () => <ExampleSelect />,
} satisfies Meta<typeof Select>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const trigger = canvas.getByRole("combobox", { name: "Fruit" });

    await expect(trigger).toHaveTextContent("Select a fruit");
    await userEvent.click(trigger);

    const page = within(canvasElement.ownerDocument.body);
    const option = await page.findByRole("option", { name: "Mango" });

    await waitFor(() => expect(option).toBeVisible());
    await userEvent.click(option);
    await expect(trigger).toHaveTextContent("Mango");
    await waitFor(() =>
      expect(page.queryByRole("option", { name: "Mango" })).not.toBeInTheDocument(),
    );
  },
};

export const Disabled: Story = {
  render: () => <ExampleSelect disabled />,
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("combobox", { name: "Fruit" });

    await expect(trigger).toBeDisabled();
    await expect(trigger).toHaveAttribute("data-disabled");
  },
};
