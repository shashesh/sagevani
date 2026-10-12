import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { SLUG_REQUIRED_MESSAGE } from '@/collections/shared/slug'
import config from '@/payload.config'
import type { DifficultyLevel, User } from '@/payload-types'

import { clearContent, createStaff, validationMessages } from '../helpers/content'
import { paragraph, richText, verse } from '../helpers/lexical'

let payload: Payload
let owner: User
let level: DifficultyLevel

const draft = (data: { title: string; slug?: string; summary?: string; body?: unknown }) =>
  payload.create({
    collection: 'articles',
    data: data as { title: string },
    draft: true,
    overrideAccess: false,
    user: owner,
  })

describe('articles: fields the server fills in', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearContent(payload)
    ;({ owner } = await createStaff(payload))
    level = await payload.create({
      collection: 'difficultyLevels',
      data: { name: 'Beginner', order: 1 },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  it('makes the slug from the title, without diacritics', async () => {
    expect((await draft({ title: 'Māyā and the Rope' })).slug).toBe('maya-and-the-rope')
  })

  it('cleans a typed slug', async () => {
    expect((await draft({ title: 'x', slug: 'Śiva, Then  Ṛta' })).slug).toBe('siva-then-rta')
  })

  it('refuses a slug another article has, naming it', async () => {
    await draft({ title: 'Karma' })
    expect(await validationMessages(draft({ title: 'Karma' }))).toEqual([
      'The slug "karma" is already used. Choose another.',
    ])
  })

  it('keeps the stored slug when an update only publishes', async () => {
    const created = await draft({ title: 'Karma' })
    expect(created.slug).toBe('karma')

    const renamed = await payload.update({
      collection: 'articles',
      id: created.id,
      data: { title: 'Karma and the right to act' },
      draft: true,
      overrideAccess: false,
      user: owner,
    })
    expect(renamed.slug).toBe('karma')

    const published = await payload.update({
      collection: 'articles',
      id: created.id,
      data: { _status: 'published', shape: 'vani-note', difficulty: level.id },
      overrideAccess: false,
      user: owner,
    })
    expect(published.slug).toBe('karma')
  })

  it('lets a draft have no slug, but not a published article', async () => {
    expect((await draft({ title: 'कर्म' })).slug ?? null).toBeNull()
    const publish = payload.create({
      collection: 'articles',
      data: { title: 'कर्म', shape: 'vani-note', difficulty: level.id, _status: 'published' },
      overrideAccess: false,
      user: owner,
    })
    expect(await validationMessages(publish)).toEqual([SLUG_REQUIRED_MESSAGE])
  })

  it('counts reading time from the body, block text included', async () => {
    const words = (count: number) => Array.from({ length: count }, () => 'word').join(' ')
    const article = await draft({
      title: 't',
      body: richText(
        paragraph(words(150)),
        verse({
          transliteration: words(30),
          translation: words(30),
          textName: 'Gītā',
          location: '2.47',
          translator: 'T',
        }),
      ),
    })
    expect(article.readingTime).toBe(2)
  })

  it('stores search text without diacritics, from title, summary and body', async () => {
    const article = await draft({
      title: 'Māyā and the Rope',
      summary: 'On Śaṅkara.',
      body: richText(
        verse({
          transliteration: 'karmaṇy evādhikāras te',
          translation: 'Your right is to action alone.',
          textName: 'Bhagavad Gītā',
          location: '2.47',
          translator: 'T',
        }),
      ),
    })
    expect(article.searchText).toContain('maya and the rope')
    expect(article.searchText).toContain('on sankara.')
    expect(article.searchText).toContain('karmany evadhikaras te')
    expect(article.searchText).toContain('bhagavad gita')
  })

  it('cannot have its reading time or search text set through the API', async () => {
    const article = await payload.create({
      collection: 'articles',
      data: { title: 'Short', readingTime: 99, searchText: 'forged' },
      draft: true,
      overrideAccess: false,
      user: owner,
    })
    expect(article.readingTime).toBe(1)
    expect(article.searchText).toBe('short')
  })
})
