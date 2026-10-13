import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { THEMES, WIDTHS } from './viewports'

/**
 * Cross-cutting accessibility, screenshot and `noindex` checks across every page type (stage 3
 * design, section 10), against the `standard` scenario that every other file in this directory
 * assumes (tests/e2e/README.md). Each page type already has its own spec covering its content and
 * behavior; this file reuses the exact same real, seeded URLs and only checks the cross-cutting
 * concerns that apply to all of them alike.
 *
 * The genuine error page (global-error.tsx / error.tsx for a real server crash) cannot be cleanly
 * triggered in an automated CI run, so it is not included here; its accessibility and screenshot
 * check is a manual, documented step in the PR's test plan instead (stage 3b plan, Task 16).
 */

const PAGES = [
  { name: 'landing', path: '/' },
  { name: 'archive', path: '/articles' },
  { name: 'topic', path: '/topics/adhyatma' },
  { name: 'start-here', path: '/start-here' },
  { name: 'fixed page', path: '/about' },
  { name: 'corrections', path: '/corrections' },
  { name: '404', path: '/totally-unknown-xyz' },
]

test.describe('every page type', () => {
  test.setTimeout(180_000)

  for (const { name, path } of PAGES) {
    test.describe(name, () => {
      test('passes axe checks in both themes', async ({ page }) => {
        for (const colorScheme of THEMES) {
          await page.emulateMedia({ colorScheme })
          await page.goto(path)
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .analyze()
          expect(
            results.violations,
            `${name} ${colorScheme}: ${JSON.stringify(results.violations, null, 2)}`,
          ).toEqual([])
        }
      })

      test('screenshots at every test width in both themes', async ({ page }, testInfo) => {
        for (const colorScheme of THEMES) {
          await page.emulateMedia({ colorScheme })
          for (const width of WIDTHS) {
            await page.setViewportSize({ width, height: 900 })
            await page.goto(path)
            await page.evaluate(() => document.fonts.ready)
            // Next's dev-tools button would sit on top of the content.
            await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
            // Saved for review as a CI artifact; not compared pixel by pixel (spec 10).
            await page.screenshot({
              path: testInfo.outputPath(`${name.replace(/\s+/g, '-')}-${colorScheme}-${width}.png`),
              fullPage: true,
            })
          }
        }
      })

      test('carries exactly one noindex robots meta tag', async ({ page }) => {
        await page.goto(path)
        const robots = page.locator('meta[name="robots"]')
        await expect(robots).toHaveCount(1)
        await expect(robots).toHaveAttribute('content', /noindex/)
      })

      test('does not scroll sideways at 320px', async ({ page }) => {
        await page.setViewportSize({ width: 320, height: 800 })
        await page.goto(path)
        await page.evaluate(() => document.fonts.ready)
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
        expect(scrollWidth).toBeLessThanOrEqual(320)
      })
    })
  }
})
