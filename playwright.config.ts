import { defineConfig, devices } from "@playwright/test";
import { E2E_PORT } from "./e2e/helpers.js";

// `npm run test:e2e`. Memakai Google Chrome yang terpasang (channel "chrome"), karena
// lomba mewajibkan Chrome. Tanpa Chrome: `npx playwright install chromium` lalu hapus `channel`.
export default defineConfig({
  testDir: "e2e",
  // Spec berbagi satu database & jam demo, jadi dijalankan berurutan.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chrome", use: { ...devices["Desktop Chrome"], channel: "chrome" } }],
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: `http://localhost:${E2E_PORT}/api/health`,
    timeout: 240_000,
    reuseExistingServer: false,
    stdout: "ignore",
    stderr: "pipe",
  },
});
