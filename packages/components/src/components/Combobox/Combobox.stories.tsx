import type { Meta, StoryObj } from "@storybook/react-vite";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { useId } from "react";
import { expect, waitFor, within } from "storybook/test";
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxLeadingIcon,
  ComboboxList,
  ComboboxTrigger,
} from "./Combobox.tsx";

const FRUITS = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Mandarin", value: "mandarin" },
  { label: "Mango", value: "mango" },
  { label: "Mangosteen", value: "mangosteen" },
  { label: "Orange", value: "orange" },
];

function ExampleCombobox({ disabled = false }: { disabled?: boolean }) {
  const inputId = useId();

  return (
    <div
      style={{
        width: 280,
        padding: 16,
        background: "var(--components-color-background)",
        borderRadius: "var(--components-radius-surface)",
      }}
    >
      <Combobox items={FRUITS} disabled={disabled}>
        <ComboboxLabel htmlFor={inputId}>Fruit</ComboboxLabel>
        <ComboboxInputGroup>
          <ComboboxLeadingIcon>
            <MagnifyingGlassIcon />
          </ComboboxLeadingIcon>
          <ComboboxInput id={inputId} placeholder="Search for a fruit" />
          <ComboboxClear />
          <ComboboxTrigger />
        </ComboboxInputGroup>
        <ComboboxContent>
          <ComboboxEmpty>No fruits found.</ComboboxEmpty>
          <ComboboxList aria-label="Fruit">
            {(fruit: (typeof FRUITS)[number]) => (
              <ComboboxItem key={fruit.value} value={fruit}>
                {fruit.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

const META = {
  title: "Components/Combobox",
  component: Combobox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  render: () => <ExampleCombobox />,
} satisfies Meta<typeof Combobox>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    const input = canvas.getByRole("combobox", { name: "Fruit" });

    await expect(input).toHaveAttribute("placeholder", "Search for a fruit");
    await userEvent.click(input);
    await userEvent.type(input, "man");

    const page = within(canvasElement.ownerDocument.body);
    const option = await page.findByRole("option", { name: "Mango" });

    await waitFor(() => expect(option).toBeVisible());
    await expect(page.queryByRole("option", { name: "Apple" })).not.toBeInTheDocument();
    await userEvent.click(option);
    await expect(input).toHaveValue("Mango");
  },
};

export const Disabled: Story = {
  render: () => <ExampleCombobox disabled />,
  play: async ({ canvas }) => {
    const input = canvas.getByRole("combobox", { name: "Fruit" });

    await expect(input).toBeDisabled();
  },
};
