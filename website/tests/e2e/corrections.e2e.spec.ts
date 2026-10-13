import { expect, test } from '@playwright/test'

test.describe('the corrections page', () => {
  test('lists the public correction, linking to its article, and hides the private one', async ({
    page,
  }) => {
    const response = await page.goto('/corrections')
    expect(response?.status()).toBe(200)

    await expect(page.getByText('Correction, 9 October 2026', { exact: false })).toBeVisible()
    await expect(page.getByText('A public correction for the test.')).toBeVisible()
    await expect(page.getByText('A private note for the test.')).toHaveCount(0)

    const link = page.getByRole('link', { name: 'A test article to read' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/articles/e2e-reading')
  })

  test("shows a working link to the corrections page on an article's own correction notes", async ({
    page,
  }) => {
    await page.goto('/articles/e2e-reading')
    const link = page.getByRole('link', { name: 'All corrections' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '/corrections')
    await link.click()
    await expect(page).toHaveURL('/corrections')
  })
})
