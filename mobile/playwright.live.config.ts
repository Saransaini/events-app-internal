import { defineConfig } from '@playwright/test';

// Checks the deployed site (LIVE_URL) — see e2e-live/. No local server.
export default defineConfig({
  testDir: './e2e-live',
  timeout: 90_000,
  reporter: [['list']],
  use: {
    screenshot: 'only-on-failure',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
});
