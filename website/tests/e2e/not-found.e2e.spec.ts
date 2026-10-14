import { expect, test } from '@playwright/test'

/**
 * The site's 404 pages (stage 3 design, 6.4). Two different mechanisms answer these, and both
 * need checking separately (see src/app/global-not-found.tsx and (frontend)/not-found.tsx):
 * - a URL that matches no route at all goes through global-not-found.tsx, which renders its own
 *   header and footer because it sits outside every route group's layout;
 * - a URL that matches a route (an article's own address) but whose content doesn't exist goes
 *   through (frontend)/not-found.tsx, inside the normal (frontend) layout.
 * Both must be the site's designed page, not Next's generic default, and both carry noindex.
 */
test.describe('not found', () => {
  test('shows the designed 404 for a genuinely unmatched single-segment URL', async ({ page }) => {
    const response = await page.goto('/totally-unknown-xyz')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page can’t be found')
    await expect(page.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/')
    await expect(page.getByRole('link', { name: 'Browse the archive' })).toHaveAttribute(
      'href',
      '/articles',
    )
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })

  test('shows the designed 404 for a genuinely unmatched multi-segment URL', async ({ page }) => {
    const response = await page.goto('/foo/bar/baz')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page can’t be found')
    await expect(page.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/')
    await expect(page.getByRole('link', { name: 'Browse the archive' })).toHaveAttribute(
      'href',
      '/articles',
    )
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })

  test('shows the designed 404, inside the normal layout, for an unpublished article', async ({
    page,
  }) => {
    const response = await page.goto('/articles/e2e-draft-only')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page can’t be found')
    await expect(page.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/')
    await expect(page.getByRole('link', { name: 'Browse the archive' })).toHaveAttribute(
      'href',
      '/articles',
    )
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    // The normal (frontend) layout wraps this one, unlike the two unmatched-route cases above.
    await expect(page.getByRole('banner').getByRole('link', { name: 'SageVani' })).toHaveAttribute(
      'href',
      '/',
    )
    await expect(page.getByRole('contentinfo')).toBeVisible()
  })
})
