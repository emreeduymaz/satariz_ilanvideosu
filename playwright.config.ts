/// <reference types="node" />
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: './playwright.global-setup.ts',

  // ⬇️ Fonksiyon vermek yerine dosya yolu veriyoruz
  globalTeardown: './playwright.global-teardown.ts',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 30_000,
  },
  projects: [
    {
      name: 'mobile-375x812',
      use: {
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
        video: 'on',
      },
    },
  ],
});
