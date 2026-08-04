import type { Decorator, Preview } from "@storybook/react-vite";
import { useEffect } from "storybook/preview-api";
import "@fontsource-variable/karla";
// @ts-expect-error Vite loads this side-effect stylesheet in the Storybook preview.
import "../src/styles/tokens.css";

const WITH_THEME: Decorator = (Story, context) => {
  const background = context.globals.backgrounds;
  const backgroundValue = typeof background === "string" ? background : background?.value;
  const theme = backgroundValue === "dark" ? "dark" : "light";

  useEffect(() => {
    const root = document.documentElement;
    const previousTheme = root.dataset.theme;

    root.dataset.theme = theme;

    return () => {
      if (previousTheme === undefined) {
        delete root.dataset.theme;
      } else {
        root.dataset.theme = previousTheme;
      }
    };
  }, [theme]);

  return Story();
};

const PREVIEW: Preview = {
  decorators: [WITH_THEME],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "error",
    },
    backgrounds: {
      options: {
        light: {
          name: "Light",
          value: "#efede7",
        },
        dark: {
          name: "Dark",
          value: "#252523",
        },
      },
    },
  },
  initialGlobals: {
    backgrounds: {
      value: "light",
    },
  },
};

export default PREVIEW;
