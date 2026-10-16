import { expect, test } from '@playwright/test'

import { ARCHIVE_SLUG_WITH_PRIOR_READING } from './seed-site'
import { useScenario } from './scenario'

// Each test switches scenario, which changes seeded data; a retry can't start clean.
test.describe.configure({ retries: 0 })

test.describe('scenario seeding', () => {
  test.setTimeout(120_000)

  test.afterAll(async () => {
    // Every other test file assumes `standard`; always restore it, even if a test above failed.
    await useScenario('standard')
  })

  test('empty leaves nothing published but the levels and topics', async ({ request }) => {
    await useScenario('empty')

    const articles = await (await request.get('/api/articles?limit=1')).json()
    expect(articles.totalDocs).toBe(0)
    const pages = await (await request.get('/api/pages?limit=1')).json()
    expect(pages.totalDocs).toBe(0)
    const topics = await (await request.get('/api/topics?limit=1')).json()
    expect(topics.totalDocs).toBe(4)
    const levels = await (await request.get('/api/difficultyLevels?limit=1')).json()
    expect(levels.totalDocs).toBe(2)
  })

  test('six publishes exactly six articles, curated settings and one About page', async ({
    request,
  }) => {
    await useScenario('six')

    const articles = await (await request.get('/api/articles?limit=1')).json()
    expect(articles.totalDocs).toBe(6)
    const about = await (await request.get('/api/pages?where[slug][equals]=about&depth=0')).json()
    expect(about.docs).toHaveLength(1)
    const settings = await (await request.get('/api/globals/siteSettings?depth=0')).json()
    expect(settings.featuredArticle).toBeTruthy()
    expect(settings.featuredPicks).toHaveLength(1)
  })

  test('standard seeds at least 13 published articles and curated settings', async ({
    request,
  }) => {
    await useScenario('standard')

    const articles = await (await request.get('/api/articles?limit=1')).json()
    expect(articles.totalDocs).toBeGreaterThanOrEqual(13)

    const pages = await (
      await request.get('/api/pages?where[slug][in]=about,how-sagevani-writes,start-here&depth=0')
    ).json()
    expect(pages.docs).toHaveLength(3)
    // The draft page never shows up in a public read; only the three published ones do.
    const publicPages = await (await request.get('/api/pages?limit=1')).json()
    expect(publicPages.totalDocs).toBe(3)

    const settings = await (await request.get('/api/globals/siteSettings?depth=0')).json()
    expect(settings.aboutText).toBeTruthy()
    expect(settings.featuredArticle).toBeTruthy()
    expect(settings.featuredPicks.length).toBeGreaterThan(0)
    expect(settings.startHere.length).toBeGreaterThan(0)

    const priorReading = await (
      await request.get(
        `/api/articles?where[slug][equals]=${ARCHIVE_SLUG_WITH_PRIOR_READING}&depth=0`,
      )
    ).json()
    expect(priorReading.docs[0]?.readFirst).toHaveLength(1)
  })
})
