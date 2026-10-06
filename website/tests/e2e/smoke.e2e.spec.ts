import { expect, test } from '@playwright/test'

test('home page shows the SageVani name', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('SageVani')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('SageVani')
})

test('admin asks for an email to sign in or create the first account', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/(login|create-first-user)/)
  await expect(page.locator('input[name="email"]')).toBeVisible()
})
