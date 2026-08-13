import type { Meta, StoryObj } from "@storybook/react-vite";
import { HouseIcon } from "@phosphor-icons/react/House";
import { ListChecksIcon } from "@phosphor-icons/react/ListChecks";
import { NotebookIcon } from "@phosphor-icons/react/Notebook";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { expect } from "storybook/test";
import { Button } from "../Button/Button.tsx";
import { ButtonIcon } from "../Button/ButtonIcon.tsx";
import { TabBar, TabBarItem } from "./TabBar.tsx";

function ExampleTabBar({ action }: { action?: boolean }) {
  return (
    <div style={{ width: 380 }}>
      <TabBar
        label="Sections"
        action={
          action ? (
            <Button aria-label="New entry" size="icon" variant="primary">
              <ButtonIcon>
                <PlusIcon />
              </ButtonIcon>
            </Button>
          ) : undefined
        }
      >
        <TabBarItem active icon={<HouseIcon />} label="Home" />
        <TabBarItem icon={<NotebookIcon />} label="Journal" />
        <TabBarItem icon={<ListChecksIcon />} label="Habits" />
      </TabBar>
    </div>
  );
}

const META = {
  title: "Components/TabBar",
  component: TabBar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  render: () => <ExampleTabBar action />,
} satisfies Meta<typeof TabBar>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const home = canvas.getByRole("button", { name: "Home" });

    await expect(home).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByRole("button", { name: "Journal" })).not.toHaveAttribute(
      "aria-current",
    );
    await expect(canvas.getByRole("navigation", { name: "Sections" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "New entry" })).toBeVisible();
  },
};

export const WithoutAction: Story = {
  render: () => <ExampleTabBar />,
};
