import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    // Tes integrasi menyalakan MongoDB in-memory; unduhan biner pertama bisa lama.
    hookTimeout: 120_000,
  },
});
