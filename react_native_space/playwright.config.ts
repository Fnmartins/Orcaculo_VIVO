import { defineConfig } from '@playwright/test';

const PORTA_TESTE = 8082;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results/playwright',
  use: {
    baseURL: `http://127.0.0.1:${PORTA_TESTE}`,
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: `yarn expo start --web --port ${PORTA_TESTE}`,
    url: `http://127.0.0.1:${PORTA_TESTE}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'mobile-320', use: { viewport: { width: 320, height: 700 } } },
    { name: 'mobile-375', use: { viewport: { width: 375, height: 812 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 } } },
    { name: 'mobile-430', use: { viewport: { width: 430, height: 932 } } },
  ],
});
