import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { BarChart } from "./BarChart.tsx";
import type { BarChartProps } from "./BarChart.tsx";

const CHANNEL_DATA = [
  { channel: "Direct", sessions: 48 },
  { channel: "Search", sessions: 36 },
  { channel: "Social", sessions: 24 },
  { channel: "Email", sessions: 18 },
];

function BarChartStory(props: BarChartProps<(typeof CHANNEL_DATA)[number]>) {
  return <BarChart {...props} />;
}

const META = {
  title: "Components/Charts/Bar",
  component: BarChartStory,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    data: CHANNEL_DATA,
    description: "Sessions by acquisition channel.",
    series: [{ dataKey: "sessions", label: "Sessions" }],
    title: "Where people find us",
    xKey: "channel",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "720px", maxWidth: "calc(100vw - 32px)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BarChartStory>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Where people find us", { selector: "div" })).toBeVisible();
    await expect(canvas.getByRole("application", { name: "Where people find us" })).toBeVisible();
  },
};
