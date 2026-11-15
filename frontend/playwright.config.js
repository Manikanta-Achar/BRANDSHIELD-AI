import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results/demo",
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
  reporter: [["list"], ["json", { outputFile: ".qa/reports/demo-browser.json" }]],
  webServer: [
    {
      command: "npm.cmd run dev -- --port 4173 --strictPort",
      env: { VITE_DEMO_MODE: "true" },
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      command: "npm.cmd run dev -- --port 4174 --strictPort --mode api",
      env: {
        VITE_DEMO_MODE: "false",
        VITE_API_BASE_URL: "http://127.0.0.1:8000",
      },
      url: "http://127.0.0.1:4174",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
