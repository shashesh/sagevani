import { expect, test } from '@playwright/test'

/**
 * The `/[slug]` route: any published fixed page other than one with its own fixed route (stage 3
 * design, 6.3). The standard scenario (seed-site.ts) publishes About, How SageVani writes and
 * Start here, and leaves one page, `e2e-draft-page`, as a draft.
 */
test.describe('a fixed page', () => {
  test('shows its title and body', async ({ page }) => {
    const response = await page.goto('/about')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('About')
    await expect(page.getByText('A test body for the "About" page.')).toBeVisible()
  })

  test('answers 404 for a draft page', async ({ page }) => {
    const response = await page.goto('/e2e-draft-page')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("This page can’t be found")
  })

  test('answers 404 for an unknown slug', async ({ page }) => {
    const response = await page.goto('/this-does-not-exist')
    expect(response?.status()).toBe(404)
  })

  test('answers 404 for a reserved slug, rather than erroring', async ({ page }) => {
    const response = await page.goto('/search')
    expect(response?.status()).toBe(404)
  })
})
