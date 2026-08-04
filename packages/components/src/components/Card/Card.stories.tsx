import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Card, CardContent, CardHeader, CardImage, CardTitle } from "./Card.tsx";

const PODCAST_THUMBNAIL_SRC = new URL("./recording-mic.jpg", import.meta.url).href;

const META = {
  title: "Components/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Card title</CardTitle>
        </CardHeader>
        <CardContent>A simple surface for grouping related content.</CardContent>
      </>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ width: "calc(var(--size-10) * 10)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default META;
type Story = StoryObj<typeof META>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const card = canvas.getByRole("heading", { name: "Card title" }).parentElement;

    await expect(card?.parentElement).toHaveTextContent("A simple surface");
    await expect(card?.parentElement?.tagName).toBe("DIV");
  },
};

export const WithLeftImage: Story = {
  render: () => (
    <Card>
      <CardImage alt="A studio microphone with a pop filter" src={PODCAST_THUMBNAIL_SRC} />
      <CardHeader>
        <CardTitle>Designing for attention</CardTitle>
      </CardHeader>
      <CardContent>
        <div>The Field Notes Podcast</div>
        <small>Episode 12 · 32 min</small>
      </CardContent>
    </Card>
  ),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("img", {
        name: "A studio microphone with a pop filter",
      }),
    ).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Designing for attention" })).toBeVisible();
    await expect(canvas.getByText("The Field Notes Podcast")).toBeVisible();
    await expect(canvas.getByText("Episode 12 · 32 min")).toBeVisible();
  },
};
