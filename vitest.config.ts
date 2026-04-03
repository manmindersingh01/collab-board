import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
    exclude: ["node_modules", ".next", "app/generated"],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["app/api/**", "lib/**"],
      exclude: ["app/generated/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
