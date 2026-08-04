import type { Meta, StoryObj } from "@storybook/react-vite";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import { expect, waitFor, within } from "storybook/test";
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "./Menu.tsx";

function ExampleMenu({ disabled = false }: { disabled?: boolean }) {
  return (
    <Menu>
      <MenuTrigger disabled={disabled}>
        View
        <CaretDownIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuContent align="start">
        <MenuGroup>
          <MenuGroupLabel>Actions</MenuGroupLabel>
          <MenuItem>Duplicate</MenuItem>
          <MenuItem>Rename</MenuItem>
          <MenuItem disabled>Archive</MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuCheckboxItem defaultChecked>Show labels</MenuCheckboxItem>
        <MenuRadioGroup defaultValue="comfortable">
          <MenuGroupLabel>Density</MenuGroupLabel>
          <MenuRadioItem value="compact">Compact</MenuRadioItem>
          <MenuRadioItem value="comfortable">Comfortable</MenuRadioItem>
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}

const META = {
  title: "Components/Menu",
  component: Menu,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  render: () => <ExampleMenu />,
} satisfies Meta<typeof Menu>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas, canvasElement, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "View" }));

    const page = within(canvasElement.ownerDocument.body);
    const menu = await page.findByRole("menu");

    await waitFor(() => expect(menu).toBeVisible());
    await expect(page.getByRole("menuitem", { name: "Archive" })).toHaveAttribute("data-disabled");
    await userEvent.click(page.getByRole("menuitem", { name: "Duplicate" }));
    await waitFor(() => expect(page.queryByRole("menu")).not.toBeInTheDocument());
  },
};

export const Disabled: Story = {
  render: () => <ExampleMenu disabled />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "View" })).toBeDisabled();
  },
};

export const IconOnly: Story = {
  render: () => (
    <Menu>
      <MenuTrigger size="icon" aria-label="More actions">
        <DotsThreeIcon aria-hidden="true" />
      </MenuTrigger>
      <MenuContent>
        <MenuItem>Edit</MenuItem>
      </MenuContent>
    </Menu>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "More actions" });

    await expect(trigger).toHaveStyle({
      width: "40px",
      height: "40px",
      paddingInline: "0px",
    });
  },
};
