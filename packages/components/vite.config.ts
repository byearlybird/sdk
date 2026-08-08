import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "vite-plus/test/browser-playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const DIRNAME = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/**/*.test.{ts,tsx}"],
          environment: "node",
        },
      },
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(DIRNAME, ".storybook"),
            storybookScript: "vp run storybook --no-open",
          }),
        ],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
  pack: {
    copy: [{ from: "src/styles/tokens.css", rename: "tokens.css" }],
    entry: ["src/index.ts", "src/charts.ts"],
    dts: {
      tsgo: true,
    },
    deps: {
      neverBundle: ["react", "react-dom", "react/jsx-runtime"],
    },
    exports: false,
    format: ["esm"],
    sourcemap: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
