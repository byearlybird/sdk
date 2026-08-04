import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { PieChart } from "./PieChart.tsx";
import type { PieChartProps } from "./PieChart.tsx";

const MIX_DATA = [
  { segment: "Individual", value: 54 },
  { segment: "Team", value: 29 },
  { segment: "Enterprise", value: 17 },
];

function PieChartStory(props: PieChartProps<(typeof MIX_DATA)[number]>) {
  return <PieChart {...props} />;
}

const META = {
  title: "Components/Charts/Pie",
  component: PieChartStory,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    data: MIX_DATA,
    description: "Share of active accounts by plan.",
    nameKey: "segment",
    title: "Customer mix",
    valueFormatter: (value) => `${value}%`,
    valueKey: "value",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "720px", maxWidth: "calc(100vw - 32px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PieChartStory>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Customer mix", { selector: "div" })).toBeVisible();
    await expect(canvas.getByText("54%")).toBeVisible();
    await expect(canvas.getByRole("application", { name: "Customer mix" })).toBeVisible();
  },
};
