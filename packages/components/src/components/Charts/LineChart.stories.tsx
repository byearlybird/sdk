import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { LineChart } from "./LineChart.tsx";
import type { LineChartProps } from "./LineChart.tsx";

const MONTHLY_DATA = [
  { month: "Jan", current: 42, previous: 32 },
  { month: "Feb", current: 48, previous: 38 },
  { month: "Mar", current: 45, previous: 41 },
  { month: "Apr", current: 58, previous: 44 },
  { month: "May", current: 64, previous: 49 },
  { month: "Jun", current: 72, previous: 55 },
];

function LineChartStory(props: LineChartProps<(typeof MONTHLY_DATA)[number]>) {
  return <LineChart {...props} />;
}

const META = {
  title: "Components/Charts/Line",
  component: LineChartStory,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    data: MONTHLY_DATA,
    description: "Monthly active accounts over the last six months.",
    series: [
      { dataKey: "current", label: "This year" },
      { dataKey: "previous", label: "Last year" },
    ],
    title: "Account growth",
    xKey: "month",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "720px", maxWidth: "calc(100vw - 32px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LineChartStory>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Account growth", { selector: "div" })).toBeVisible();
    await expect(canvas.getByRole("list", { name: "Chart legend" })).toBeVisible();
    await expect(canvas.getByRole("application", { name: "Account growth" })).toBeVisible();
  },
};
