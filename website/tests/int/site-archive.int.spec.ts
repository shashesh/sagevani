import { getPayload, type Payload, type RequiredDataFromCollectionSlug } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ARCHIVE_PAGE_SIZE, countArchive, findArchivePage } from '@/lib/site/archive'
import { levelSlug } from '@/lib/site/lookups'
import { topicArticleCounts } from '@/lib/site/topics'
import config from '@/payload.config'
import type { DifficultyLevel, Topic, User } from '@/payload-types'

import { clearContent, createStaff } from '../helpers/content'
import { paragraph, richText } from '../helpers/lexical'

let payload: Payload
let owner: User
let beginner: DifficultyLevel
let advanced: DifficultyLevel
let dharma: Topic
let adhyatma: Topic

type ArticleData = Partial<RequiredDataFromCollectionSlug<'articles'>> & {
  title: string
  slug: string
}

const publish = (data: ArticleData) =>
  payload.create({
    collection: 'articles',
    data: {
      shape: 'inquiry-essay',
      difficulty: beginner.id,
      body: richText(paragraph('A test body.')),
      ...data,
      _status: 'published',
    },
    overrideAccess: false,
    user: owner,
  })

describe('the archive read', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearContent(payload)
    ;({ owner } = await createStaff(payload))
    beginner = await payload.create({
      collection: 'difficultyLevels',
      data: { name: 'Beginner', order: 1, needsPriorReading: false },
      overrideAccess: true,
    })
    advanced = await payload.create({
      collection: 'difficultyLevels',
      data: { name: 'Advanced', order: 2, needsPriorReading: true },
      overrideAccess: true,
    })
    dharma = await payload.create({
      collection: 'topics',
      data: {
        name: 'Dharma',
        slug: 'dharma',
        question: 'How shall I live?',
        order: 1,
        coverTint: { background: '#e3cfa8', text: '#3d2f1c' },
      },
      overrideAccess: true,
    })
    adhyatma = await payload.create({
      collection: 'topics',
      data: {
        name: 'Adhyātma',
        slug: 'adhyatma',
        question: 'Who am I?',
        order: 2,
        coverTint: { background: '#cfcbc5', text: '#2b2a2c' },
      },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  it('counts and lists published articles only, newest first', async () => {
    await publish({ title: 'Oldest', slug: 'oldest' })
    await publish({ title: 'Middle', slug: 'middle' })
    await publish({ title: 'Newest', slug: 'newest' })
    await payload.create({
      collection: 'articles',
      data: { title: 'A draft', slug: 'a-draft' },
      draft: true,
      overrideAccess: true,
    })

    const filters = { topicSlug: null, shape: null, levelSlug: null }
    expect(await countArchive(payload, filters)).toBe(3)
    const page = await findArchivePage(payload, filters, 1)
    expect(page.map((article) => article.slug)).toEqual(['newest', 'middle', 'oldest'])
  })

  it('filters by topic, resolved from its slug', async () => {
    await publish({ title: 'In Dharma', slug: 'in-dharma', topics: [dharma.id] })
    await publish({ title: 'In Adhyatma', slug: 'in-adhyatma', topics: [adhyatma.id] })
    await publish({ title: 'In neither', slug: 'in-neither' })

    const filters = { topicSlug: 'dharma', shape: null, levelSlug: null }
    expect(await countArchive(payload, filters)).toBe(1)
    const page = await findArchivePage(payload, filters, 1)
    expect(page.map((article) => article.slug)).toEqual(['in-dharma'])
  })

  it('filters by shape directly', async () => {
    await publish({ title: 'A note', slug: 'a-note', shape: 'vani-note' })
    await publish({ title: 'An essay', slug: 'an-essay', shape: 'inquiry-essay' })

    const filters = { topicSlug: null, shape: 'vani-note', levelSlug: null }
    expect(await countArchive(payload, filters)).toBe(1)
    const page = await findArchivePage(payload, filters, 1)
    expect(page.map((article) => article.slug)).toEqual(['a-note'])
  })

  it('filters by difficulty, resolved from its folded slug', async () => {
    await publish({ title: 'A beginner piece', slug: 'a-beginner-piece' })
    await publish({
      title: 'An advanced piece',
      slug: 'an-advanced-piece',
      difficulty: advanced.id,
      readFirst: [
        {
          kind: 'external',
          title: 'Context',
          author: 'An author',
          url: 'https://example.org/context',
          reason: 'Sets context.',
        },
      ],
    })

    expect(levelSlug(advanced.name)).toBe('advanced')
    const filters = { topicSlug: null, shape: null, levelSlug: 'advanced' }
    expect(await countArchive(payload, filters)).toBe(1)
    const page = await findArchivePage(payload, filters, 1)
    expect(page.map((article) => article.slug)).toEqual(['an-advanced-piece'])
  })

  it('combines every filter', async () => {
    await publish({
      title: 'Matches every filter',
      slug: 'matches-every-filter',
      topics: [dharma.id],
      shape: 'practice-journal',
      difficulty: advanced.id,
      readFirst: [
        {
          kind: 'external',
          title: 'Context',
          author: 'An author',
          url: 'https://example.org/context',
          reason: 'Sets context.',
        },
      ],
    })
    await publish({
      title: 'Matches topic and shape only',
      slug: 'matches-topic-and-shape-only',
      topics: [dharma.id],
      shape: 'practice-journal',
    })

    const filters = { topicSlug: 'dharma', shape: 'practice-journal', levelSlug: 'advanced' }
    expect(await countArchive(payload, filters)).toBe(1)
    const page = await findArchivePage(payload, filters, 1)
    expect(page.map((article) => article.slug)).toEqual(['matches-every-filter'])
  })

  it('an unknown filter slug matches nothing instead of ignoring the filter', async () => {
    await publish({ title: 'In Dharma', slug: 'in-dharma', topics: [dharma.id] })
    const filters = { topicSlug: 'no-such-topic', shape: null, levelSlug: null }
    expect(await countArchive(payload, filters)).toBe(0)
    expect(await findArchivePage(payload, filters, 1)).toEqual([])
  })

  it('paginates with Payload native limit and page', async () => {
    for (let index = 0; index < ARCHIVE_PAGE_SIZE + 2; index += 1) {
      await publish({ title: `Article ${index + 1}`, slug: `article-${index + 1}` })
    }
    const filters = { topicSlug: null, shape: null, levelSlug: null }
    expect(await countArchive(payload, filters)).toBe(ARCHIVE_PAGE_SIZE + 2)
    const firstPage = await findArchivePage(payload, filters, 1)
    const secondPage = await findArchivePage(payload, filters, 2)
    expect(firstPage).toHaveLength(ARCHIVE_PAGE_SIZE)
    expect(secondPage).toHaveLength(2)
    const slugs = new Set([...firstPage, ...secondPage].map((article) => article.slug))
    expect(slugs.size).toBe(ARCHIVE_PAGE_SIZE + 2)
  })

  // topicArticleCounts shares this describe's payload/beforeEach fixtures (dharma, adhyatma,
  // owner) rather than its own beforeAll/afterAll: getPayload caches its instance by config, so a
  // second beforeAll in a later describe in this file would hand back the first describe's
  // already-destroyed instance and hang every query against it.
  it('counts only published articles, not drafts or a pending-draft edit of a published one', async () => {
    await publish({ title: 'Published in Dharma', slug: 'published-in-dharma', topics: [dharma.id] })
    await publish({
      title: 'Published in Adhyatma',
      slug: 'published-in-adhyatma',
      topics: [adhyatma.id],
    })
    await payload.create({
      collection: 'articles',
      data: { title: 'A draft in Dharma', slug: 'a-draft-in-dharma', topics: [dharma.id] },
      draft: true,
      overrideAccess: true,
    })
    const publishedWithPendingEdit = await publish({
      title: 'Published, with a pending edit',
      slug: 'published-with-pending-edit',
      topics: [dharma.id],
    })
    await payload.update({
      collection: 'articles',
      id: publishedWithPendingEdit.id,
      data: { title: 'An unpublished edit to a published article' },
      draft: true,
      overrideAccess: true,
    })

    const counts = await topicArticleCounts(payload, [dharma.id, adhyatma.id])

    // 2 published in Dharma (the pending-draft edit's published version still counts, the
    // separate draft-only article doesn't), 1 published in Adhyatma.
    expect(counts).toEqual({ [String(dharma.id)]: 2, [String(adhyatma.id)]: 1 })
  })

  it('answers 0 for a topic with no published articles', async () => {
    const counts = await topicArticleCounts(payload, [dharma.id])
    expect(counts).toEqual({ [String(dharma.id)]: 0 })
  })
})
