import { E2E_OWNER } from './owner'
import { E2E_NAVIGATION } from './seed-reading'
import { E2E_BASE_URL } from './server'

// Mirrors DEFAULT_TAGLINE in src/globals/SiteSettings.ts. Not imported from there: this file runs
// directly in Playwright's own process (not a tsx subprocess), and that module's collection
// hooks reach `next/cache`, which plain Node ESM can't resolve outside Next's own bundler.
const DEFAULT_TAGLINE = 'Where silence learns to speak.'

const RETRY_WAIT_MS = 3_000

/**
 * A cold compile can answer an /api call with a 5xx, or reset the connection outright before
 * responding at all; try once more after a short wait either way.
 */
async function fetchWithOneRetry(url: string, init: RequestInit): Promise<Response> {
  try {
    const first = await fetch(url, init)
    if (first.status < 500) return first
  } catch {
    // A connection reset throws instead of resolving; fall through to the retry below.
  }
  await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT_MS))
  return fetch(url, init)
}

/** The site settings fields a scenario can set through the running site. */
export interface SiteSettingsInput {
  tagline?: string
  aboutText?: string | null
  featuredArticle?: number | null
  featuredPicks?: number[]
  startHere?: number[]
  navigation?: { label: string; path: string }[]
  footerMotto?: string | null
}

/** Every field reset to its default, so a scenario only has to name what it wants to differ. */
const DEFAULT_SETTINGS: Required<SiteSettingsInput> = {
  tagline: DEFAULT_TAGLINE,
  aboutText: null,
  featuredArticle: null,
  featuredPicks: [],
  startHere: [],
  navigation: E2E_NAVIGATION,
  footerMotto: null,
}

/**
 * Saves site settings through the running server, signed in as the test owner. This is the only
 * way the browser tests can change site settings, because the save must run inside Next: it is
 * what clears the `site` cache tag (stage 3 design 4.3), including for content a scenario seeded
 * directly through the Local API, which runs outside Next and so refreshes nothing on its own.
 *
 * Every field not named in `settings` resets to its default, so each scenario's call fully
 * describes the settings it needs, rather than layering onto whatever the last scenario left.
 */
export async function saveSettingsThroughTheSite(settings: SiteSettingsInput = {}): Promise<void> {
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
    body: JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }),
  })
  if (!saved.ok) throw new Error(`Saving site settings through the site failed: ${saved.status}`)
}

/** A published article's id, read through the public REST API, for a scenario's own settings. */
export async function publishedArticleIdBySlug(slug: string): Promise<number> {
  const response = await fetchWithOneRetry(
    `${E2E_BASE_URL}/api/articles?where[slug][equals]=${slug}&depth=0`,
    { headers: { 'Content-Type': 'application/json' } },
  )
  if (!response.ok) throw new Error(`Looking up article "${slug}" failed: ${response.status}`)
  const { docs } = (await response.json()) as { docs: { id: number }[] }
  const doc = docs[0]
  if (!doc) throw new Error(`No published article "${slug}"`)
  return doc.id
}
