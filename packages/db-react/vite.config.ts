import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.tsx"],
    dts: {
      tsgo: true,
    },
    deps: {
      neverBundle: ["@byearlybird/db", "react", "react/jsx-runtime"],
    },
    exports: true,
    format: ["esm"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
