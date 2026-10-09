import { expect, test } from '@playwright/test'
import sharp from 'sharp'

import { E2E_OWNER } from './owner'

const ADVANCED_NEEDS_READING = 'This difficulty level needs at least one suggested prior reading.'

test('the owner writes an article, the publish rules stop it, and it publishes once fixed', async ({
  page,
}, testInfo) => {
  // The first visit to the admin compiles it, which is slow on a cold CI runner.
  test.setTimeout(180_000)
  const imagePath = testInfo.outputPath('vermilion.png')
  await sharp({ create: { width: 640, height: 400, channels: 3, background: '#9a3b26' } })
    .png()
    .toFile(imagePath)

  await page.goto('/admin/login')
  await page.locator('input[name="email"]').fill(E2E_OWNER.email)
  await page.locator('input[name="password"]').fill(E2E_OWNER.password)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/admin\/?$/)

  // With autosave on, opening "create" saves a draft at once and moves to its edit page.
  await page.goto('/admin/collections/articles/create')
  await expect(page).toHaveURL(/\/admin\/collections\/articles\/\d+$/)

  await page.getByRole('textbox', { name: 'Title *' }).fill('Karma and the right to act')
  await page.locator('#field-shape').click()
  await page.getByRole('option', { name: 'Inquiry Essay' }).click()
  await page.locator('#field-difficulty').click()
  await page.getByRole('option', { name: 'Advanced' }).click()

  const editor = page.locator('[data-lexical-editor="true"]')
  await editor.click()
  await page.keyboard.type('What does it mean to act without claiming the fruit?')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/')
  await page.getByRole('option', { name: 'Verse' }).click()
  await page.locator('#field-transliteration').fill('karmaṇy evādhikāras te mā phaleṣu kadācana')
  await page
    .locator('#field-translation')
    .fill('Your right is to the action alone, never to its fruits.')
  await page.locator('#field-textName').fill('Bhagavad Gītā')
  await page.locator('#field-location').fill('2.47')
  await page.locator('#field-translator').fill('Test translation')

  await editor.locator('p').last().click()
  await page.keyboard.type('/')
  await page.getByRole('option', { name: 'Upload' }).click()
  await page.getByRole('button', { name: 'Add new Media' }).click()
  const drawer = page.getByRole('dialog').last()
  await drawer.locator('input[type="file"]').setInputFiles(imagePath)
  await drawer.locator('#field-alt').fill('A vermilion square')
  await drawer.locator('#field-creator').fill('Sagevani')
  await drawer.locator('#field-source').fill('Made for this test')
  await drawer.locator('#field-licence').fill('Own work')
  await drawer.getByRole('button', { name: 'Save' }).click()
  await expect(editor.getByRole('button', { name: 'Edit Media' })).toBeVisible()

  await page.getByRole('button', { name: 'Publish changes' }).click()
  await expect(page.getByText(ADVANCED_NEEDS_READING).first()).toBeVisible()
  await expect(page.getByText(/Status:\s*Draft/).first()).toBeVisible()

  await page.getByRole('button', { name: 'Add Prior reading' }).click()
  await page.locator('input[name="readFirst.0.title"]').fill('Bhagavad Gītā, chapter 2')
  await page.getByRole('button', { name: 'Publish changes' }).click()
  await expect(page.getByText(/Status:\s*Published/).first()).toBeVisible()
  await expect(page.locator('#field-approval__versionId')).not.toHaveValue('')
})
