import { expect, test } from '@playwright/test'

import { publishedArticleId, signInAsOwner } from './sign-in'

test('a draft leaves the public page alone, and publishing updates it', async ({ page }) => {
  test.setTimeout(180_000)
  const reader = await page.context().newPage()
  const heading = reader.getByRole('heading', { level: 1 })

  // Read it first, so the page and its data are cached before the edit.
  await reader.goto('/articles/e2e-publish')
  await expect(heading).toHaveText('Before the edit')

  const id = await publishedArticleId(page, 'e2e-publish')
  await signInAsOwner(page)
  await page.goto(`/admin/collections/articles/${id}`)
  const autosaved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes(`/api/articles/${id}`) &&
      response.url().includes('autosave=true'),
  )
  await page.getByRole('textbox', { name: 'Title *' }).fill('After the edit')
  await autosaved

  await reader.reload()
  await expect(heading).toHaveText('Before the edit')

  await page.getByRole('button', { name: 'Publish changes' }).click()
  await expect(page.getByText(/Status:\s*Published/).first()).toBeVisible()

  await reader.reload()
  await expect(heading).toHaveText('After the edit')
})
