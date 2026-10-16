import { execFileSync } from 'child_process'
import path from 'path'

import { E2E_DATABASE_URL } from './database'
import {
  publishedArticleIdBySlug,
  saveSettingsThroughTheSite,
  type SiteSettingsInput,
} from './refresh-site'

export type Scenario = 'standard' | 'empty' | 'six'

const ABOUT_TEXT = 'A test "About SageVani" text, written for the browser tests.'

/** The standard scenario's settings: a featured article, a few picks and a Start here list. */
async function standardSettings(): Promise<SiteSettingsInput> {
  const [featuredArticle, pickOne, pickTwo, pickThree, startOne, startTwo] = await Promise.all(
    [
      'e2e-reading',
      'e2e-archive-1',
      'e2e-archive-3',
      'e2e-archive-5',
      'e2e-related-one',
      'e2e-related-two',
    ].map(publishedArticleIdBySlug),
  )
  return {
    aboutText: ABOUT_TEXT,
    featuredArticle,
    featuredPicks: [pickOne, pickTwo, pickThree],
    startHere: [startOne, startTwo],
  }
}

/** The six scenario's settings: a featured article and one other pick. */
async function sixSettings(): Promise<SiteSettingsInput> {
  const [featuredArticle, pick] = await Promise.all(
    ['e2e-six-1', 'e2e-six-2'].map(publishedArticleIdBySlug),
  )
  return { featuredArticle, featuredPicks: [pick] }
}

/** The settings each scenario saves through the running site, once its content is seeded. */
async function settingsFor(scenario: Scenario): Promise<SiteSettingsInput> {
  switch (scenario) {
    case 'standard':
      return standardSettings()
    case 'six':
      return sixSettings()
    case 'empty':
      return {}
  }
}

/**
 * Resets the test database to one of the named scenarios (reset-database.ts), then saves site
 * settings through the running server (refresh-site.ts), which is what clears every cached public
 * page (stage 3 design 4.3) and lets a scenario's featured article, picks and Start here list
 * reference what it just seeded.
 *
 * Browser tests that switch scenario must restore `standard` in an `afterAll`, and the test file
 * must run with `test.describe.configure({ retries: 0 })`: a scenario left in place by a failed
 * test, or a retry that starts over on someone else's scenario, would leak into unrelated tests
 * that assume the standard seed. See tests/e2e/README.md.
 */
export async function useScenario(scenario: Scenario): Promise<void> {
  execFileSync(
    process.execPath,
    [path.resolve('node_modules/tsx/dist/cli.mjs'), 'tests/e2e/reset-database.ts', scenario],
    {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL, NODE_OPTIONS: '--no-deprecation' },
    },
  )
  await saveSettingsThroughTheSite(await settingsFor(scenario))
}
