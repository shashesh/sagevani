import { execFileSync } from 'child_process'
import path from 'path'

import { E2E_DATABASE_URL } from './database'

/** Resets the test database through tsx, which loads Payload the way the app's scripts do. */
export default function globalSetup(): void {
  execFileSync(
    process.execPath,
    [path.resolve('node_modules/tsx/dist/cli.mjs'), 'tests/e2e/reset-database.ts'],
    {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL, NODE_OPTIONS: '--no-deprecation' },
    },
  )
}
