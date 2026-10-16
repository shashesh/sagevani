import { expect, test } from '@playwright/test'

import { ARCHIVE_PAGE_SIZE } from '../../src/lib/site/archive'

/**
 * The archive's filters and pages (stage 3 design, 6.3), against the `standard` scenario's 15
 * published articles: seed-reading.ts's six (all Dharma, Inquiry Essay, Beginner) plus its
 * Devanagari-cover-term article (no topic, /og/[slug] fixture), plus seed-site.ts's eight archive
 * articles, cycling shape and topic and alternating difficulty (createArchiveArticles). That
 * gives, among the eight: 3 in Adhyātma (e2e-archive-1, -4, -7), 2 shaped Vani Note (e2e-archive-1,
 * -5), and 4 at Advanced (e2e-archive-2, -4, -6, -8) — see that file's comments for the full
 * breakdown.
 */

test('12 rows render on page 1, with no `page` parameter in its address', async ({ page }) => {
  const response = await page.goto('/articles')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/articles$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Articles')
  await expect(page.getByRole('article')).toHaveCount(ARCHIVE_PAGE_SIZE)
  // Page 1 is the first page: "Newer" is disabled, not a link.
  await expect(page.getByRole('link', { name: 'Newer' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Older' })).toHaveCount(1)
})

test('a page number past the last page returns 404, with exactly one noindex robots tag', async ({
  page,
}) => {
  const response = await page.goto('/articles?page=3')
  expect(response?.status()).toBe(404)
  const robots = page.locator('meta[name="robots"]')
  await expect(robots).toHaveCount(1)
  await expect(robots).toHaveAttribute('content', /noindex/)
})

test('an invalid page value returns 404', async ({ page }) => {
  const response = await page.goto('/articles?page=abc')
  expect(response?.status()).toBe(404)
})

test('`?page=1` redirects to the canonical address with no `page` parameter', async ({ page }) => {
  const response = await page.goto('/articles?page=1')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/articles$/)
})

test('the second page shows the remaining three articles, and links back to page 1 with no parameter', async ({
  page,
}) => {
  await page.goto('/articles?page=2')
  await expect(page.getByRole('article')).toHaveCount(3)
  const newer = page.getByRole('link', { name: 'Newer' })
  await expect(newer).toHaveAttribute('href', '/articles')
  // Page 2 is the last page: "Older" is disabled, not a link.
  await expect(page.getByRole('link', { name: 'Older' })).toHaveCount(0)
  await newer.click()
  await expect(page).toHaveURL(/\/articles$/)
})

test('the topic filter narrows the list', async ({ page }) => {
  await page.goto('/articles?topic=adhyatma')
  await expect(page.getByRole('article')).toHaveCount(3)
})

test('the shape filter narrows the list', async ({ page }) => {
  await page.goto('/articles?shape=vani-note')
  await expect(page.getByRole('article')).toHaveCount(2)
})

test('the difficulty filter narrows the list', async ({ page }) => {
  await page.goto('/articles?difficulty=advanced')
  await expect(page.getByRole('article')).toHaveCount(4)
})

test('combined filters narrow further', async ({ page }) => {
  await page.goto('/articles?topic=adhyatma&shape=vani-note')
  await expect(page.getByRole('article')).toHaveCount(1)
})

test('an unknown filter value is ignored, as if it were absent', async ({ page }) => {
  await page.goto('/articles?topic=no-such-topic')
  await expect(page.getByRole('article')).toHaveCount(ARCHIVE_PAGE_SIZE)
})

test('the filter form works and "Clear filters" returns to the unfiltered list', async ({
  page,
}) => {
  await page.goto('/articles')
  await page.getByLabel('Topic').selectOption({ label: 'Adhyātma' })
  await page.getByRole('button', { name: 'Apply filters' }).click()
  await expect(page).toHaveURL(/topic=adhyatma/)
  await expect(page.getByRole('article')).toHaveCount(3)

  await page.getByRole('link', { name: 'Clear filters' }).click()
  await expect(page).toHaveURL(/\/articles$/)
  await expect(page.getByRole('article')).toHaveCount(ARCHIVE_PAGE_SIZE)
})

test.describe('with JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false })

  test('the filter form still submits as a plain GET request', async ({ page }) => {
    await page.goto('/articles')
    await page.getByLabel('Topic').selectOption({ label: 'Adhyātma' })
    await page.getByRole('button', { name: 'Apply filters' }).click()
    await expect(page).toHaveURL(/topic=adhyatma/)
    await expect(page.getByRole('article')).toHaveCount(3)
  })
})
