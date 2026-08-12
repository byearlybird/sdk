import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  lint: {
    // design-sync preview sources are compiled by the design-sync converter's
    // own esbuild pass (its own module resolution, asset loaders and
    // `@ds-stories` aliases), not by this program — they can never resolve here.
    ignorePatterns: [".design-sync/**"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: true,
  },
});
