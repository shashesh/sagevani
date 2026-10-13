import { execFileSync } from 'child_process'
import path from 'path'

import { E2E_DATABASE_URL } from './database'
import { E2E_OWNER } from './owner'
import { E2E_NAVIGATION } from './seed-reading'
import { E2E_BASE_URL } from './server'

/**
 * Resets and seeds the test database through tsx, then saves site settings through the running
 * server. That save runs inside Next, so it expires every cached public read: next dev keeps
 * unstable_cache entries in .next/dev between runs, and the seed itself runs outside Next.
 */
export default async function globalSetup(): Promise<void> {
  execFileSync(
    process.execPath,
    [path.resolve('node_modules/tsx/dist/cli.mjs'), 'tests/e2e/reset-database.ts'],
    {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL, NODE_OPTIONS: '--no-deprecation' },
    },
  )
  await saveSettingsThroughTheSite()
}

const RETRY_WAIT_MS = 3_000

/** A cold compile can answer an /api call with a 5xx; try once more after a short wait. */
async function fetchWithOneRetry(url: string, init: RequestInit): Promise<Response> {
  const first = await fetch(url, init)
  if (first.status < 500) return first
  await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT_MS))
  return fetch(url, init)
}

async function saveSettingsThroughTheSite(): Promise<void> {
  const login = await fetchWithOneRetry(`${E2E_BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_OWNER.email, password: E2E_OWNER.password }),
  })
  if (!login.ok) throw new Error(`The test owner could not sign in: ${login.status}`)
  const { token } = (await login.json()) as { token?: string }
  if (!token) throw new Error('The sign-in answered without a token')
  const saved = await fetchWithOneRetry(`${E2E_BASE_URL}/api/globals/siteSettings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify({ navigation: E2E_NAVIGATION }),
  })
  if (!saved.ok) throw new Error(`Saving site settings through the site failed: ${saved.status}`)
}
