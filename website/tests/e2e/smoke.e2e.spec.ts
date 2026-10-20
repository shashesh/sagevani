import { expect, test } from '@playwright/test'

// Mirrors DEFAULT_TAGLINE in src/globals/SiteSettings.ts (same note as landing.e2e.spec.ts: this
// file runs directly in Playwright's own process, which can't resolve that module's next/cache
// import outside Next's own bundler).
const DEFAULT_TAGLINE = 'Where silence learns to speak.'

test('home page shows the SageVani name and tagline', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('SageVani')
  await expect(page.getByRole('link', { name: 'SageVani', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(DEFAULT_TAGLINE)
})

test('admin asks for an email to sign in or create the first account', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/(login|create-first-user)/)
  await expect(page.locator('input[name="email"]')).toBeVisible()
})

test('the GraphQL API and its playground are not served', async ({ request }) => {
  const query = await request.post('/api/graphql', { data: { query: '{ __typename }' } })
  expect(query.status()).toBe(404)
  const playground = await request.get('/api/graphql-playground')
  expect(playground.status()).toBe(404)
})
