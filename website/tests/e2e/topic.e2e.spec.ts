import { expect, test } from '@playwright/test'

/**
 * `/topics/[slug]` (stage 3 design, 6.3), against the `standard` scenario: Adhyātma is the one
 * topic seeded with a non-empty `intro` (seed-site.ts), and has 3 published articles
 * (e2e-archive-1, -4, -7; see archive.e2e.spec.ts's comment for the full breakdown). That is fewer
 * than ARCHIVE_PAGE_SIZE, so only a single page of Adhyātma renders here: the archive's own tests
 * (archive.e2e.spec.ts) already cover a second page and its "Newer"/"Older" links exhaustively.
 */

test('shows the topic\'s name, question, intro and its published articles', async ({ page }) => {
  const response = await page.goto('/topics/adhyatma')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Adhyātma')
  await expect(page.getByText('Who am I?')).toBeVisible()
  await expect(
    page.getByText('An introduction to Adhyātma, written for the browser tests.'),
  ).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(3)
})

test('a topic with only one page of articles shows no pagination controls', async ({ page }) => {
  await page.goto('/topics/adhyatma')
  await expect(page.getByRole('link', { name: 'Newer' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Older' })).toHaveCount(0)
})

test('a topic with no intro shows its name, question and articles without one', async ({
  page,
}) => {
  const response = await page.goto('/topics/bhakti')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Bhakti')
  await expect(
    page.getByText('What is the Divine, and what is my relationship to it?'),
  ).toBeVisible()
})

test('answers 404 for an unknown topic slug', async ({ page }) => {
  const response = await page.goto('/topics/this-does-not-exist')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("This page can’t be found")
})

test('answers 404 for a page number past the last page', async ({ page }) => {
  const response = await page.goto('/topics/adhyatma?page=2')
  expect(response?.status()).toBe(404)
})

test('`?page=1` redirects to the canonical address with no `page` parameter', async ({ page }) => {
  const response = await page.goto('/topics/adhyatma?page=1')
  expect(response?.status()).toBe(200)
  await expect(page).toHaveURL(/\/topics\/adhyatma$/)
})

test('carries noindex', async ({ page }) => {
  await page.goto('/topics/adhyatma')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})
