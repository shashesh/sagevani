import { expect, test } from '@playwright/test'

import { publishedArticleId, signInAsOwner } from './sign-in'

test.describe('live preview', () => {
  test.setTimeout(180_000)

  test('is a 404 for anyone not signed in', async ({ page }) => {
    const id = await publishedArticleId(page, 'e2e-preview')
    const response = await page.goto(`/preview/articles/${id}`)
    expect(response?.status()).toBe(404)
    await expect(page.getByText('The draft title')).toHaveCount(0)
  })

  test('shows the owner the draft beside the editor, and follows each autosave', async ({
    page,
  }) => {
    const id = await publishedArticleId(page, 'e2e-preview')
    await signInAsOwner(page)
    await page.goto(`/admin/collections/articles/${id}`)
    await page.getByRole('button', { name: 'Live Preview' }).click()

    const preview = page.frameLocator('iframe')
    await expect(preview.getByRole('heading', { level: 1, name: 'The draft title' })).toBeVisible({
      timeout: 60_000,
    })
    await page.getByRole('textbox', { name: 'Title *' }).fill('The draft title, edited')
    await expect(
      preview.getByRole('heading', { level: 1, name: 'The draft title, edited' }),
    ).toBeVisible({ timeout: 30_000 })

    // The public page still shows the published title while the draft waits.
    const reader = await page.context().newPage()
    await reader.goto('/articles/e2e-preview')
    await expect(reader.getByRole('heading', { level: 1 })).toHaveText('The live title')

    // The admin remembers an open preview for the owner, and its narrow editor hides the sidebar
    // fields the publish test reads. Close it again.
    await page.getByRole('button', { name: 'Live Preview' }).click()
    await expect(page.locator('iframe')).toBeHidden()
  })
})
