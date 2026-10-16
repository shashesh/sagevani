import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { THEMES, WIDTHS } from './viewports'

const loadedTiroFaces = (page: Page): Promise<number> =>
  page.evaluate(async () => {
    await document.fonts.ready
    return [...document.fonts].filter(
      (face) => face.status === 'loaded' && face.family.includes('Tiro'),
    ).length
  })

const scrollWidth = (page: Page): Promise<number> =>
  page.evaluate(() => document.documentElement.scrollWidth)

test.describe('reading an article', () => {
  // The first visit compiles the route, which is slow on a cold CI runner.
  test.setTimeout(180_000)

  test('shows every part of the article page, in order', async ({ page }) => {
    const response = await page.goto('/articles/e2e-reading')
    expect(response?.status()).toBe(200)

    const article = page.getByRole('article').first()
    const head = article.locator('header').first()
    await expect(head.getByRole('heading', { level: 1 })).toHaveText('A test article to read')
    await expect(head).toContainText('Dharma · Inquiry Essay')
    await expect(head).toContainText('Sagevani')
    await expect(head).toContainText('min read')
    await expect(head).toContainText('Beginner')

    const before = page.getByRole('complementary', { name: 'Before you read' })
    await expect(before.getByRole('link', { name: 'A related piece' })).toHaveAttribute(
      'href',
      '/articles/e2e-related-one',
    )
    await expect(before.getByRole('link', { name: 'A book elsewhere' })).toHaveAttribute(
      'href',
      'https://example.org/book',
    )

    const body = page.locator('#article-body')
    await expect(body.locator('[lang="sa-Deva"]')).toHaveText('कर्मण्येवाधिकारस्ते मा फलेषु कदाचन')
    await expect(body.locator('[lang="sa-Latn"]')).toHaveText(
      'karmaṇy evādhikāras te mā phaleṣu kadācana',
    )
    await expect(body.getByText('As A named school reads it')).toBeVisible()
    await expect(body.getByText('Practice', { exact: true })).toBeVisible()
    await expect(body.getByRole('link', { name: 'A link to the related piece.' })).toHaveAttribute(
      'href',
      '/articles/e2e-related-one',
    )
    const image = body.locator('img')
    await expect(image).toHaveAttribute('alt', 'A vermilion field')
    await expect
      .poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth))
      .toBeGreaterThan(0)

    await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\/\?text=/,
    )
    await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Primary text' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Academic' })).toBeVisible()
    await expect(page.getByText('Correction, 9 October 2026.')).toBeVisible()
    await expect(page.getByText('A private note for the test.')).toHaveCount(0)

    const more = page.getByRole('region', { name: 'More from Dharma' })
    // The link's accessible name now starts with its label row (topic and shape), so match the title at the end.
    await expect(more.getByRole('link', { name: /A related piece$/ })).toBeVisible()
    await expect(more.getByRole('link', { name: /A test article to read$/ })).toHaveCount(0)

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

    // Top edges, from the title to the "More from" row, only ever go down the page.
    const tops = await Promise.all(
      [
        head.getByRole('heading', { level: 1 }),
        head.locator('xpath=following-sibling::*[1]'),
        before,
        body,
        page.getByRole('region', { name: 'Share this article' }),
        page.getByRole('heading', { name: 'Sources', level: 2 }),
        page.getByText('Correction, 9 October 2026.'),
        more,
      ].map(async (locator) => (await locator.boundingBox())?.y ?? Number.NaN),
    )
    expect(tops.every((top, index) => index === 0 || top > tops[index - 1]!)).toBe(true)
  })

  test('loads the Devanagari font only where a verse needs it', async ({ page }) => {
    await page.goto('/articles/e2e-reading')
    expect(await loadedTiroFaces(page)).toBeGreaterThan(0)
    await page.goto('/articles/e2e-related-one')
    expect(await loadedTiroFaces(page)).toBe(0)
  })

  test('answers 404 for a draft, an unknown slug and a malformed one', async ({ page }) => {
    for (const slug of ['e2e-draft-only', 'no-such-article', 'Not_A_Slug']) {
      const response = await page.goto(`/articles/${slug}`)
      expect(response?.status(), slug).toBe(404)
    }
  })

  test('puts more space above the Practice block than between paragraphs', async ({ page }) => {
    await page.goto('/articles/e2e-reading')
    const margins = await page.evaluate(() => {
      const body = document.querySelector('#article-body')
      if (!body) throw new Error('No article body')
      const label = [...body.querySelectorAll('p')].find(
        (element) => element.textContent?.trim() === 'Practice',
      )
      const block = label?.parentElement
      // A body paragraph that is not inside a block, and not the first child (which has no margin).
      const paragraph = [...body.querySelectorAll('p')].find(
        (element) =>
          element.parentElement === block?.parentElement && element.previousElementSibling,
      )
      if (!block || !paragraph) throw new Error('No Practice block or body paragraph')
      return {
        practice: parseFloat(getComputedStyle(block).marginTop),
        paragraph: parseFloat(getComputedStyle(paragraph).marginTop),
      }
    })
    expect(margins.paragraph).toBeGreaterThan(0)
    expect(margins.practice).toBeGreaterThan(margins.paragraph)
  })

  test('does not scroll sideways on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    for (const slug of ['e2e-reading', 'e2e-long-title']) {
      await page.goto(`/articles/${slug}`)
      await page.evaluate(() => document.fonts.ready)
      expect(await scrollWidth(page), slug).toBeLessThanOrEqual(320)
    }
  })

  test('keeps the 1200:630 cover shape on the "More from" cards', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/articles/e2e-reading')
    const covers = page
      .getByRole('region', { name: 'More from Dharma' })
      .getByRole('link')
      .locator(':scope > *:first-child')
    const count = await covers.count()
    expect(count).toBeGreaterThan(0)
    for (let index = 0; index < count; index += 1) {
      const box = await covers.nth(index).boundingBox()
      if (!box) throw new Error(`Cover ${index} has no box`)
      const expected = (box.width * 630) / 1200
      expect(Math.abs(box.height - expected), `cover ${index}`).toBeLessThanOrEqual(1)
    }
  })

  test('passes axe checks in both themes', async ({ page }) => {
    for (const colorScheme of THEMES) {
      await page.emulateMedia({ colorScheme })
      await page.goto('/articles/e2e-reading')
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(
        results.violations,
        `${colorScheme}: ${JSON.stringify(results.violations, null, 2)}`,
      ).toEqual([])
    }
  })

  test('screenshots at every test width in both themes', async ({ page }, testInfo) => {
    for (const colorScheme of THEMES) {
      await page.emulateMedia({ colorScheme })
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/articles/e2e-reading')
        await page.evaluate(() => document.fonts.ready)
        // Next's dev-tools button would sit on top of the content.
        await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
        // Saved for review as a CI artifact; not compared pixel by pixel (spec 10).
        await page.screenshot({
          path: testInfo.outputPath(`article-${colorScheme}-${width}.png`),
          fullPage: true,
        })
      }
    }
  })
})
