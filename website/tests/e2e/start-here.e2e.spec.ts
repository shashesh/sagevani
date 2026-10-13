import { expect, test } from '@playwright/test'

/**
 * `/start-here` (stage 3 design, 6.3). The standard scenario (seed-site.ts, scenario.ts) publishes
 * a "Start here" page and saves its article list as `e2e-related-one`, then `e2e-related-two`.
 */
test.describe('the Start-here page', () => {
  test('shows the page body, then its articles in the configured order', async ({ page }) => {
    const response = await page.goto('/start-here')
    expect(response?.status()).toBe(200)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Start here')
    await expect(page.getByText('A test body for the "Start here" page.')).toBeVisible()

    // Each card's title is an h3 (ArticleCard); the grid shows them in the configured order.
    const titles = page.getByRole('heading', { level: 3 })
    await expect(titles).toHaveCount(2)
    await expect(titles.nth(0)).toHaveText('A related piece')
    await expect(titles.nth(1)).toHaveText('Another related piece')

    const firstLink = page.getByRole('link').filter({ hasText: 'A related piece' })
    await expect(firstLink).toHaveAttribute('href', '/articles/e2e-related-one')
  })
})
