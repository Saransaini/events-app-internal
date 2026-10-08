import { defineConfig } from '@playwright/test';

// End-to-end test of the web build against the local Firebase emulators.
// Run with `npm run test:e2e` in mobile/, which exports the app pointed at
// the emulators and starts them — see "End-to-end test" in the root README.
export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  use: {
    baseURL: 'http://127.0.0.1:8090',
    viewport: { width: 420, height: 860 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: {
    command: 'node e2e/serve.mjs dist-e2e 8090',
    url: 'http://127.0.0.1:8090',
    reuseExistingServer: true,
  },
});
