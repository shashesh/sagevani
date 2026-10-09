import { defineConfig, devices } from '@playwright/test'

import { E2E_DATABASE_URL } from './tests/e2e/database'

// Its own port, so a dev server on 3000 with the dev database is never reused by mistake.
const PORT = 3100
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  // Playwright starts webServer first, then this. Both use the test database.
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    navigationTimeout: 45_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    // Never reuse a server already on this port: it may use another database, and these tests write to it.
    reuseExistingServer: false,
    timeout: 120_000,
    // Merged over process.env. Next doesn't override a variable that is already set with .env.
    env: { DATABASE_URL: E2E_DATABASE_URL },
  },
})
