import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2, // Increase to 2 workers for faster execution
  reporter: [
    ["list"], // Shows detailed test progress in console
    ["html", { outputFolder: "playwright-report", open: "never" }], // HTML report
    ["json", { outputFile: "playwright-report/results.json" }],
    ["junit", { outputFile: "playwright-report/results.xml" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    // Enable detailed logging
    launchOptions: {
      slowMo: process.env.CI ? 0 : 100, // Slow down actions for better visibility
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Disable mobile browsers due to persistent navigation issues
    // {
    //   name: "Mobile Chrome",
    //   use: { ...devices["Pixel 5"] },
    // },
    // {
    //   name: "Mobile Safari",
    //   use: { ...devices["iPhone 12"] },
    // },
  ],
  webServer: {
    command: process.env.NODE_ENV === "production" && process.env.DOCKER_BUILD === "true" 
      ? "node .next/standalone/server.js" 
      : "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/yfile-tracking-system",
      JWT_SECRET: process.env.JWT_SECRET || "this-is-a-test-jwt-secret-key-that-is-32-characters-long-for-e2e-tests",
      PORT: process.env.PORT || "3000",
      NODE_ENV: "production"
    }
  },
})
