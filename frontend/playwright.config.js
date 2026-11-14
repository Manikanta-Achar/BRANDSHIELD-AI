import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1440, height: 1000 },
  },
  reporter: "list",
  webServer: [
    {
      command: "npm.cmd run dev -- --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: "npm.cmd run dev -- --port 4174 --strictPort --mode api",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
