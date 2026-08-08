import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vite-plus/test";

const tokensCss = readFileSync(
  fileURLToPath(new URL("../src/styles/tokens.css", import.meta.url)),
  "utf8",
);

/**
 * The public design-token contract.
 *
 * Adding a token here is a minor release. Renaming, removing, or changing the
 * meaning of one is a breaking change. This test exists so neither happens by
 * accident.
 */
const SUPPORTED_TOKENS = [
  // Layout
  "--eb-border-width",
  "--eb-size-1",
  "--eb-size-2",
  "--eb-size-3",
  "--eb-size-4",
  "--eb-size-5",
  "--eb-size-6",
  "--eb-size-7",
  "--eb-size-8",
  "--eb-size-9",
  "--eb-size-10",
  // Typography
  "--eb-font-family",
  "--eb-font-size-body",
  "--eb-font-size-title",
  "--eb-font-weight-regular",
  "--eb-font-weight-semibold",
  "--eb-line-height-none",
  "--eb-line-height-normal",
  // Color
  "--eb-color-primary",
  "--eb-color-primary-text",
  "--eb-color-background",
  "--eb-color-text",
  "--eb-color-text-muted",
  "--eb-color-border",
  "--eb-color-muted",
  "--eb-color-danger",
  "--eb-color-scrim",
  "--eb-chart-series-1",
  "--eb-chart-series-2",
  "--eb-chart-series-3",
  // Shape
  "--eb-radius-surface",
  "--eb-radius-input",
  "--eb-radius-button",
  // Elevation
  "--eb-shadow-raised-content",
  "--eb-shadow-elevated-content",
  // Motion
  "--eb-motion-duration",
  "--eb-motion-easing-standard",
  "--eb-motion-easing-out",
];

/** Tokens that must be redefined in every theme block. */
const THEMED_TOKENS = [
  "--eb-color-primary",
  "--eb-color-primary-text",
  "--eb-color-background",
  "--eb-color-text",
  "--eb-color-text-muted",
  "--eb-color-border",
  "--eb-color-muted",
  "--eb-color-danger",
  "--eb-chart-series-1",
  "--eb-chart-series-2",
  "--eb-chart-series-3",
];

const THEME_BLOCKS = [':where([data-theme="light"])', ':where([data-theme="dark"])'];

function declaredTokens(css: string) {
  return new Set(css.match(/--[a-z0-9-]+(?=\s*:)/g) ?? []);
}

test("every supported token is declared", () => {
  const declared = declaredTokens(tokensCss);

  for (const token of SUPPORTED_TOKENS) {
    expect(declared.has(token), `${token} is missing from tokens.css`).toBe(true);
  }
});

test("tokens.css declares nothing outside the supported contract", () => {
  const extra = [...declaredTokens(tokensCss)].filter((token) => !SUPPORTED_TOKENS.includes(token));

  expect(extra, `undocumented tokens would ship as public API: ${extra.join(", ")}`).toEqual([]);
});

test("every token is namespaced so it cannot collide with consumer properties", () => {
  const unnamespaced = [...declaredTokens(tokensCss)].filter((token) => !token.startsWith("--eb-"));

  expect(unnamespaced).toEqual([]);
});

test("themed tokens are defined in both explicit theme blocks", () => {
  for (const selector of THEME_BLOCKS) {
    const start = tokensCss.indexOf(selector);
    expect(start, `${selector} block is missing`).toBeGreaterThan(-1);

    const block = tokensCss.slice(start, tokensCss.indexOf("}", start));

    for (const token of THEMED_TOKENS) {
      expect(block.includes(`${token}:`), `${selector} does not define ${token}`).toBe(true);
    }
  }
});

test("components reference only supported tokens", () => {
  const componentsDir = fileURLToPath(new URL("../src/components", import.meta.url));
  const sources = readdirSync(componentsDir, { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.endsWith(".css") || entry.endsWith(".tsx"))
    .map((entry) => readFileSync(join(componentsDir, entry), "utf8"));

  // Custom properties owned by Base UI or set locally on an element, not by tokens.css.
  const EXTERNAL = /^--(anchor|available|transform-origin|drawer|eb-chart-height)/;

  const unknown = new Set<string>();

  for (const source of sources) {
    for (const match of source.match(/var\(\s*(--[a-z0-9-]+)/g) ?? []) {
      const token = match.replace(/var\(\s*/, "");
      if (!SUPPORTED_TOKENS.includes(token) && !EXTERNAL.test(token)) {
        unknown.add(token);
      }
    }
  }

  expect([...unknown], "components reference tokens that are not in the contract").toEqual([]);
});
