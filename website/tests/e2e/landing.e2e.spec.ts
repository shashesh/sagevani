import { expect, test } from '@playwright/test'

import { useScenario } from './scenario'

/**
 * The landing page (stage 3 design, 6.2), against the `empty` and `six` scenarios: the `standard`
 * scenario's archive-sized article list would make Latest's "not already shown above" exclusion
 * hard to read at a glance, so these use scenarios built for exactly this (tests/e2e/README.md).
 */

// Mirrors DEFAULT_TAGLINE in src/globals/SiteSettings.ts. Not imported from there: this file runs
// directly in Playwright's own process (not a tsx subprocess), and that module's collection hooks
// reach `next/cache`, which plain Node ESM can't resolve outside Next's own bundler
// (refresh-site.ts has the same note).
const DEFAULT_TAGLINE = 'Where silence learns to speak.'

// A scenario switch changes seeded data; a retry can't start clean.
test.describe.configure({ retries: 0 })

test.afterAll(async () => {
  // Every other test file assumes `standard`; always restore it, even if a test above failed.
  await useScenario('standard')
})

test.describe('the landing page with nothing published', () => {
  test.beforeAll(async () => {
    await useScenario('empty')
  })

  test('shows one line of placeholder text in place of the featured, Featured and Latest sections', async ({
    page,
  }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('SageVani')
    await expect(page.getByRole('heading', { name: 'Featured', exact: true })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Latest', exact: true })).toHaveCount(0)
    await expect(page.getByText('Nothing has been published here yet.')).toBeVisible()
  })

  test('still shows the sidebar and the Four questions band', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('region', { name: 'About SageVani' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'About SageVani' })).toContainText(
      DEFAULT_TAGLINE,
    )
    // No published About page in the `empty` scenario: no link to it.
    await expect(
      page.getByRole('region', { name: 'About SageVani' }).getByRole('link'),
    ).toHaveCount(0)
    // No Start-here list in the `empty` scenario: the box is hidden entirely.
    await expect(page.getByRole('region', { name: 'Start here' })).toHaveCount(0)
    const topics = page.getByRole('region', { name: 'Topics' })
    await expect(topics).toBeVisible()
    await expect(topics.getByRole('link')).toHaveCount(4)

    const band = page.getByRole('region', { name: 'Four questions' })
    await expect(band).toBeVisible()
    await expect(band.getByRole('link')).toHaveCount(4)
  })
})

test.describe('the landing page with six published articles', () => {
  test.beforeAll(async () => {
    await useScenario('six')
  })

  test('shows the featured article once, as an h2', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole('heading', { level: 2, name: 'Six-scenario test article 1' }),
    ).toBeVisible()
  })

  test('shows Featured and Latest once each, with no duplicates', async ({ page }) => {
    await page.goto('/')

    const featuredSection = page.getByRole('region', { name: 'Featured', exact: true })
    await expect(featuredSection.getByRole('article')).toHaveCount(1)
    await expect(
      featuredSection.getByRole('heading', { name: 'Six-scenario test article 2' }),
    ).toBeVisible()

    const latestSection = page.getByRole('region', { name: 'Latest', exact: true })
    await expect(latestSection.getByRole('article')).toHaveCount(4)
    // The featured article and its one pick (articles 1 and 2) are never shown twice.
    await expect(
      latestSection.getByRole('heading', { name: 'Six-scenario test article 1', exact: true }),
    ).toHaveCount(0)
    await expect(
      latestSection.getByRole('heading', { name: 'Six-scenario test article 2', exact: true }),
    ).toHaveCount(0)
    for (const n of [3, 4, 5, 6]) {
      await expect(
        latestSection.getByRole('heading', { name: `Six-scenario test article ${n}` }),
      ).toBeVisible()
    }
  })

  test('"All articles" links to the archive', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'All articles →' }).click()
    await expect(page).toHaveURL(/\/articles$/)
  })

  test('links to the About page once it is published', async ({ page }) => {
    await page.goto('/')
    await expect(
      page
        .getByRole('region', { name: 'About SageVani' })
        .getByRole('link', { name: 'Read more →' }),
    ).toHaveAttribute('href', '/about')
  })

  test('still shows the sidebar and the Four questions band', async ({ page }) => {
    await page.goto('/')
    const topics = page.getByRole('region', { name: 'Topics' })
    await expect(topics.getByRole('link')).toHaveCount(4)
    const band = page.getByRole('region', { name: 'Four questions' })
    await expect(band).toBeVisible()
    await expect(band.getByRole('link')).toHaveCount(4)
  })

  test('carries noindex', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })
})
