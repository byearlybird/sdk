import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts", "src/capacitor.ts", "src/opfs.ts", "src/opfs.worker.ts"],
    dts: {
      tsgo: true,
    },
    exports: false,
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
