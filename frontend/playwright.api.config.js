import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/integration",
  workers: 1,
  timeout: 180000,
  expect: { timeout: 20000 },
  outputDir: "test-results/api",
  use: {
    baseURL: "http://127.0.0.1:4175",
    channel: "chrome",
    headless: true,
    actionTimeout: 15000,
    screenshot: "only-on-failure",
    // Authentication bodies may contain credentials: retain no browser traces.
    trace: "off",
    viewport: { width: 1440, height: 1000 },
  },
  reporter: [["list"], ["json", { outputFile: ".qa/reports/api-browser.json" }]],
  webServer: {
    command: `${process.platform === "win32" ? "npm.cmd" : "npm"} run dev -- --port 4175 --strictPort`,
    url: "http://127.0.0.1:4175",
    env: { VITE_DEMO_MODE: "false", VITE_API_BASE_URL: process.env.E2E_API_URL || "http://127.0.0.1:8000/api/v1" },
    reuseExistingServer: false,
    timeout: 30000,
  },
});
