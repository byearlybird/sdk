import * as React from "react";
import { Card, CardContent, CardHeader, CardImage, CardTitle } from "@byearlybird/components";
// The story builds this src with `new URL("./recording-mic.jpg", import.meta.url)`, which esbuild
// resolves against the `ds-preview.invalid` import.meta define — a host that never loads, so the
// preview rendered a broken image. Importing the asset routes it through the `.jpg -> dataurl`
// loader instead, inlining the real photo the storybook reference shows.
import PODCAST_THUMBNAIL_SRC from "../../packages/components/src/components/Card/recording-mic.jpg";

// Mirrors META.decorators in Card.stories.tsx.
function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: "calc(var(--eb-size-10) * 10)" }}>{children}</div>;
}

// Mirrors META.args.children.
export const Default = () => (
  <Frame>
    <Card>
      <CardHeader>
        <CardTitle>Card title</CardTitle>
      </CardHeader>
      <CardContent>A simple surface for grouping related content.</CardContent>
    </Card>
  </Frame>
);

export const WithLeftImage = () => (
  <Frame>
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
  </Frame>
);
