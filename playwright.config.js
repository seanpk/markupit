import { defineConfig, devices } from '@playwright/test';

// Browser/UX layer (NFR-2, UX-3/4/5/9/10, ACT-3). These tests boot a real markupit
// server against a fixture and drive a headless browser. Chromium runs by default;
// CI adds Firefox + WebKit for the cross-browser requirement (UX-9).
export default defineConfig({
  testDir: './test/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(process.env.CI
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
});
