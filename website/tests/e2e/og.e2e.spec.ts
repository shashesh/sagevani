import { expect, test } from '@playwright/test'

test.describe('link-preview images', () => {
  // The first visit compiles the route, which is slow on a cold CI runner.
  test.setTimeout(180_000)

  test('draws design A as a PNG for an article without a cover photo', async ({ page }) => {
    const response = await page.goto('/og/e2e-related-one')
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('image/png')
    const bytes = await response!.body()
    expect(bytes.length).toBeGreaterThan(1000)
  })

  test('crops the cover photo to a JPEG for an article with one', async ({ page }) => {
    const response = await page.goto('/og/e2e-reading')
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('image/jpeg')
    const bytes = await response!.body()
    expect(bytes.length).toBeGreaterThan(1000)
  })

  test('answers 404 for a draft, an unknown slug and a malformed one', async ({ page }) => {
    for (const slug of ['e2e-draft-only', 'no-such-article', 'Not_A_Slug']) {
      const response = await page.goto(`/og/${slug}`)
      expect(response?.status(), slug).toBe(404)
    }
  })

  test('still answers 200 for a Devanagari cover term, which it cannot shape', async ({ page }) => {
    const response = await page.goto('/og/e2e-devanagari-term')
    expect(response?.status()).toBe(200)
    expect(response?.headers()['content-type']).toBe('image/png')
    const bytes = await response!.body()
    expect(bytes.length).toBeGreaterThan(1000)
  })

  test('the article page always points its link preview at /og/[slug]', async ({ page }) => {
    await page.goto('/articles/e2e-reading')
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /\/og\/e2e-reading$/,
    )
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    )

    await page.goto('/articles/e2e-related-one')
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /\/og\/e2e-related-one$/,
    )
  })
})
