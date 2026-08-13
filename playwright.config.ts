import { defineConfig, test } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    browserName: 'chromium',
    baseURL: 'http://127.0.0.1:4212',
    headless: true,
    trace: 'on-first-retry',
  },
  reporter: 'list',
});
