import { expect, type Page } from '@playwright/test'

import { E2E_OWNER } from './owner'

export async function signInAsOwner(page: Page): Promise<void> {
  await page.goto('/admin/login')
  await page.locator('input[name="email"]').fill(E2E_OWNER.email)
  await page.locator('input[name="password"]').fill(E2E_OWNER.password)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/admin\/?$/)
}

/** A published article's id, read through the public REST API. */
export async function publishedArticleId(page: Page, slug: string): Promise<number> {
  const response = await page.request.get(`/api/articles?where[slug][equals]=${slug}&depth=0`)
  const { docs } = (await response.json()) as { docs: { id: number }[] }
  if (!docs[0]) throw new Error(`No published article "${slug}"`)
  return docs[0].id
}
