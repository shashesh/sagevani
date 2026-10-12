import { defineConfig, devices } from '@playwright/test'

import { E2E_DATABASE_URL } from './tests/e2e/database'
import { E2E_BASE_URL, E2E_PORT } from './tests/e2e/server'

const PORT = E2E_PORT
const baseURL = E2E_BASE_URL

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  // The dev server's admin answers slowly while it compiles, which a 5 s default does not allow.
  expect: { timeout: 15_000 },
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
