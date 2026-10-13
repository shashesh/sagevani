import { expect, test, type Page } from '@playwright/test'

const DARK_PAPER = 'rgb(26, 23, 20)'
const LIGHT_PAPER = 'rgb(244, 239, 228)'

const background = (page: Page): Promise<string> =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor)

test.describe('the theme', () => {
  test.setTimeout(120_000)

  test('follows the device, switches on request, and keeps the choice', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/articles/e2e-related-one')
    expect(await background(page)).toBe(DARK_PAPER)

    await page.getByRole('button', { name: 'Switch to light theme' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    expect(await background(page)).toBe(LIGHT_PAPER)

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    expect(await background(page)).toBe(LIGHT_PAPER)
    await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible()
  })

  test('puts the stored choice on <html> before <body> exists', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.addInitScript(() => {
      try {
        localStorage.setItem('sagevani-theme', 'light')
      } catch {}
      const probe = { themeWhenBodyAppeared: 'unset' }
      Object.assign(window, { __themeProbe: probe })
      new MutationObserver((_, observer) => {
        if (document.body) {
          probe.themeWhenBodyAppeared = document.documentElement.dataset.theme ?? 'none'
          observer.disconnect()
        }
      }).observe(document, { childList: true, subtree: true })
    })
    await page.goto('/articles/e2e-related-one')
    const probe = await page.evaluate(
      () => (window as unknown as { __themeProbe: { themeWhenBodyAppeared: string } }).__themeProbe,
    )
    expect(probe.themeWhenBodyAppeared).toBe('light')
  })
})
