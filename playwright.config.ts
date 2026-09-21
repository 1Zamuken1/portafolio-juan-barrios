import { defineConfig } from '@playwright/test';

const PORT = 4212;

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    browserName: 'chromium',
    baseURL: `http://127.0.0.1:${PORT}`,
    headless: true,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `pnpm exec ng serve --port ${PORT} --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: true,
    timeout: 120000,
  },
  reporter: 'list',
});
