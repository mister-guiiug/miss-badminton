import {
  defineConfig,
  devices,
  type PlaywrightTestConfig,
} from '@playwright/test';
import { basePlaywrightOptions } from '@mister-guiiug/dev-wpa-config/playwright-base';

export default defineConfig({
  ...basePlaywrightOptions,
  testMatch: /.*\.spec\.ts$/,

  // Overrides : plus de workers en local, 1 retry local pour détecter les flaky.
  workers: process.env.CI ? 1 : 4,
  retries: process.env.CI ? 2 : 1,
  expect: { timeout: 10 * 1000 },

  // Reporters multi-format (JSON + JUnit en plus de HTML/list de la base).
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
    process.env.CI ? ['github'] : [],
  ].filter(Boolean) as unknown as PlaywrightTestConfig['reporter'],

  use: {
    ...basePlaywrightOptions.use,
    reducedMotion: 'reduce',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  snapshotPathTemplate:
    '{snapshotDir}/{testFileDir}/{testFileName}-{platform}{ext}',
  snapshotDir: 'e2e/__snapshots__',
});
