import { builtinModules } from "node:module";
import { defineConfig } from "vite-plus";

const externalPackages = ["openai", "zod", "zod-to-json-schema"];
const builtinModuleIds = new Set(builtinModules.flatMap((id) => [id, `node:${id}`]));

function isExternal(id: string) {
  if (id.startsWith("node:") || builtinModuleIds.has(id)) {
    return true;
  }

  return externalPackages.some((pkg) => id === pkg || id.startsWith(`${pkg}/`));
}

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: "src/index.ts",
      fileName: "index",
      formats: ["es"],
    },
    minify: false,
    outDir: "dist",
    rollupOptions: {
      external: isExternal,
    },
    sourcemap: true,
    target: "node22",
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
