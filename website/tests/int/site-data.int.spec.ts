import {
  getPayload,
  type Payload,
  type PayloadRequest,
  type RequiredDataFromCollectionSlug,
} from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_TAGLINE } from '@/globals/SiteSettings'
import { ARTICLE_SELECT, findPublishedArticle, findRelatedArticles } from '@/lib/site/articles'
import { findSiteChrome } from '@/lib/site/chrome'
import { findArticlePreview, findPagePreview } from '@/lib/site/preview'
import config from '@/payload.config'
import type { Article, DifficultyLevel, Media, Page, Topic, User } from '@/payload-types'

import { clearContent, createStaff } from '../helpers/content'
import { image, linkTo, paragraph, richText } from '../helpers/lexical'

let payload: Payload
let owner: User
let level: DifficultyLevel
let topic: Topic
let photo: Media
let linked: Article
let later: Article
let main: Article
let livePage: Page
let draftPage: Page

type ArticleData = Partial<RequiredDataFromCollectionSlug<'articles'>> & { title: string }

const publish = (data: ArticleData) =>
  payload.create({
    collection: 'articles',
    data: { shape: 'inquiry-essay', difficulty: level.id, ...data, _status: 'published' },
    overrideAccess: false,
    user: owner,
  })

/** The owner as a signed-in request carries them: with the collection Payload adds on sign-in. */
const asViewer = (user: User): PayloadRequest['user'] =>
  ({ ...user, collection: 'users' }) as PayloadRequest['user']

describe('the public data layer', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearContent(payload)
    ;({ owner } = await createStaff(payload))
    await payload.updateGlobal({
      slug: 'siteSettings',
      data: {
        tagline: DEFAULT_TAGLINE,
        footerMotto: null,
        navigation: [],
        featuredArticle: null,
        featuredPicks: [],
        startHere: [],
      },
      overrideAccess: true,
    })
    level = await payload.create({
      collection: 'difficultyLevels',
      data: { name: 'Beginner', order: 1 },
      overrideAccess: true,
    })
    topic = await payload.create({
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
    const data = await sharp({
      create: { width: 64, height: 40, channels: 3, background: '#9a3b26' },
    })
      .png()
      .toBuffer()
    photo = await payload.create({
      collection: 'media',
      data: {
        alt: 'A vermilion field',
        creator: 'Sagevani',
        source: 'Made for this test',
        licence: 'Own work',
      },
      file: { data, mimetype: 'image/png', name: 'field.png', size: data.length },
      overrideAccess: true,
    })

    linked = await publish({ title: 'A linked article', slug: 'linked', topics: [topic.id] })
    later = await publish({ title: 'Unpublished later', slug: 'unpublished-later' })
    const draftOnly = await payload.create({
      collection: 'articles',
      data: { title: 'Only a draft', slug: 'only-a-draft' },
      draft: true,
      overrideAccess: true,
    })
    livePage = await payload.create({
      collection: 'pages',
      data: {
        title: 'Live page',
        slug: 'live-page',
        body: richText(paragraph('Live.')),
        _status: 'published',
      },
      overrideAccess: true,
    })
    draftPage = await payload.create({
      collection: 'pages',
      data: { title: 'Draft page', slug: 'draft-page', body: richText(paragraph('Draft.')) },
      draft: true,
      overrideAccess: true,
    })
    main = await publish({
      title: 'The main article',
      slug: 'main',
      summary: 'One sentence.',
      topics: [topic.id],
      coverTerm: 'dharma',
      coverImage: photo.id,
      background: 'Some background.',
      readFirst: [
        { kind: 'internal', article: linked.id, reason: 'It comes first.' },
        { kind: 'internal', article: later.id, reason: 'Unpublished after this was written.' },
        {
          kind: 'external',
          title: 'A book',
          author: 'An author',
          url: 'javascript:alert(1)',
          reason: 'Context.',
        },
      ],
      body: richText(
        paragraph('Opening.'),
        linkTo('to the linked article', 'articles', linked.id),
        linkTo('to a draft', 'articles', draftOnly.id),
        linkTo('to a live page', 'pages', livePage.id),
        linkTo('to a draft page', 'pages', draftPage.id),
        image(photo.id),
      ),
      sources: [
        { type: 'academic', work: 'A study' },
        { type: 'primary-text', work: 'A text' },
      ],
      corrections: [
        { date: '2026-10-01', change: 'An older public note.', showPublicNote: true },
        { date: '2026-10-05', change: 'A private note.', showPublicNote: false },
        { date: '2026-10-09', change: 'A newer public note.', showPublicNote: true },
      ],
    })
    await payload.update({
      collection: 'articles',
      id: later.id,
      data: { _status: 'draft' },
      overrideAccess: false,
      user: owner,
    })
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  describe('findPublishedArticle', () => {
    it('returns the view of a published article', async () => {
      const view = await findPublishedArticle(payload, 'main')
      expect(view).toMatchObject({
        title: 'The main article',
        slug: 'main',
        summary: 'One sentence.',
        shapeLabel: 'Inquiry Essay',
        difficulty: 'Beginner',
        background: 'Some background.',
        seo: { title: null, description: null },
      })
      expect(view?.topics.map(({ name }) => name)).toEqual(['Dharma'])
      expect(view?.cover).toMatchObject({ term: 'dharma', background: '#e3cfa8', text: '#3d2f1c' })
      expect(view?.readingTime).toBeGreaterThan(0)
      expect(view?.publishedAt).toEqual(expect.any(String))
    })

    it('gives null for a draft-only article, an unpublished one, and an unknown slug', async () => {
      expect(await findPublishedArticle(payload, 'only-a-draft')).toBeNull()
      expect(await findPublishedArticle(payload, 'unpublished-later')).toBeNull()
      expect(await findPublishedArticle(payload, 'no-such-article')).toBeNull()
    })

    it('shows the published version while a newer draft waits', async () => {
      await payload.update({
        collection: 'articles',
        id: main.id,
        data: { title: 'A newer draft title' },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      expect((await findPublishedArticle(payload, 'main'))?.title).toBe('The main article')
    })

    it('never carries staff-only fields or media details', async () => {
      const json = JSON.stringify(await findPublishedArticle(payload, 'main'))
      for (const hidden of [
        'approval',
        'versionId',
        'editorialChecklist',
        'emailRecipients',
        'emailSentAt',
        'searchText',
        'sendEmail',
        owner.email,
        'Made for this test',
        'Own work',
      ]) {
        expect(json).not.toContain(hidden)
      }
    })

    it('links only to published documents', async () => {
      const view = await findPublishedArticle(payload, 'main')
      expect(view?.bodyContext.links).toEqual({
        [`articles:${linked.id}`]: '/articles/linked',
        [`pages:${livePage.id}`]: '/live-page',
      })
    })

    it('gives the cover and body images with only what a page needs', async () => {
      const view = await findPublishedArticle(payload, 'main')
      const expected = {
        url: `/local-media/${photo.filename}`,
        alt: 'A vermilion field',
        width: 64,
        height: 40,
      }
      expect(view?.cover.photo).toEqual(expected)
      expect(view?.bodyContext.images).toEqual({ [String(photo.id)]: expected })
    })

    it('drops a prior reading no longer published, and shows an unsafe address as text', async () => {
      expect((await findPublishedArticle(payload, 'main'))?.readFirst).toEqual([
        {
          title: 'A linked article',
          href: '/articles/linked',
          author: null,
          reason: 'It comes first.',
        },
        { title: 'A book', href: null, author: 'An author', reason: 'Context.' },
      ])
    })

    it('groups sources in tier order, and keeps public corrections, newest first', async () => {
      const view = await findPublishedArticle(payload, 'main')
      expect(view?.sources.map(({ label }) => label)).toEqual(['Primary text', 'Academic'])
      expect(view?.corrections).toEqual([
        { date: '9 October 2026', change: 'A newer public note.' },
        { date: '1 October 2026', change: 'An older public note.' },
      ])
    })
  })

  describe('the raw article read', () => {
    it('returns exactly the selected fields to an anonymous reader', async () => {
      const { docs } = await payload.find({
        collection: 'articles',
        overrideAccess: false,
        depth: 0,
        where: { slug: { equals: 'main' } },
        select: ARTICLE_SELECT,
      })
      expect(Object.keys(docs[0]).sort()).toEqual([...Object.keys(ARTICLE_SELECT), 'id'].sort())
    })
  })

  describe('findRelatedArticles', () => {
    it('lists other published articles from the topic, newest first, at most three', async () => {
      for (const n of [1, 2, 3, 4]) {
        await publish({ title: `Related ${n}`, slug: `related-${n}`, topics: [topic.id] })
      }
      await payload.create({
        collection: 'articles',
        data: { title: 'A draft in the topic', topics: [topic.id] },
        draft: true,
        overrideAccess: true,
      })
      const otherTopic = await payload.create({
        collection: 'topics',
        data: {
          name: 'Karma',
          slug: 'karma',
          question: 'What follows from what I do?',
          order: 2,
          coverTint: { background: '#d5e0c8', text: '#2c3a22' },
        },
        overrideAccess: true,
      })
      await publish({ title: 'Newer, other topic', slug: 'other-topic', topics: [otherTopic.id] })
      await publish({ title: 'Newer, no topic', slug: 'no-topic' })
      const related = await findRelatedArticles(payload, topic.id, main.id)
      expect(related.map(({ slug }) => slug)).toEqual(['related-4', 'related-3', 'related-2'])
      const everyRelated = (await findRelatedArticles(payload, topic.id, main.id, 10)).map(
        ({ slug }) => slug,
      )
      expect(everyRelated).toEqual(['related-4', 'related-3', 'related-2', 'related-1', 'linked'])
      expect(everyRelated).not.toContain('main')
      const withoutNewest = await findRelatedArticles(payload, topic.id, related[0].id, 10)
      expect(withoutNewest.map(({ id }) => id)).not.toContain(related[0].id)
      expect(related[0]).toMatchObject({
        title: 'Related 4',
        difficulty: 'Beginner',
        topics: [{ name: 'Dharma' }],
      })
    })
  })

  describe('findSiteChrome', () => {
    it('falls back to the default tagline, with no motto and no navigation', async () => {
      expect(await findSiteChrome(payload)).toEqual({
        tagline: DEFAULT_TAGLINE,
        footerMotto: null,
        navigation: [],
      })
    })

    it('gives the motto and navigation from site settings', async () => {
      await payload.updateGlobal({
        slug: 'siteSettings',
        data: {
          footerMotto: ' A test motto ',
          navigation: [{ label: 'Articles', path: '/articles' }],
        },
        overrideAccess: true,
      })
      expect(await findSiteChrome(payload)).toEqual({
        tagline: DEFAULT_TAGLINE,
        footerMotto: 'A test motto',
        navigation: [{ label: 'Articles', path: '/articles' }],
      })
    })
  })

  describe('previews', () => {
    it('give staff the latest draft of an article', async () => {
      await payload.update({
        collection: 'articles',
        id: main.id,
        data: { title: 'A newer draft title' },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      const view = await findArticlePreview(payload, String(main.id), asViewer(owner))
      expect(view?.title).toBe('A newer draft title')
      expect(view?.bodyContext.links).toEqual({
        [`articles:${linked.id}`]: '/articles/linked',
        [`pages:${livePage.id}`]: '/live-page',
      })
    })

    it('skip a correction a draft has not finished', async () => {
      await payload.update({
        collection: 'articles',
        id: main.id,
        data: {
          corrections: [
            { date: '2026-10-09', change: '   ', showPublicNote: true },
            { date: '2026-10-08', change: 'A finished note.', showPublicNote: true },
          ],
        },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      const view = await findArticlePreview(payload, String(main.id), asViewer(owner))
      expect(view?.corrections).toEqual([{ date: '8 October 2026', change: 'A finished note.' }])
    })

    it('give nobody else anything, and refuse an id that is not one', async () => {
      expect(await findArticlePreview(payload, String(main.id), null)).toBeNull()
      expect(await findArticlePreview(payload, '1;drop', asViewer(owner))).toBeNull()
      expect(await findArticlePreview(payload, '999999', asViewer(owner))).toBeNull()
    })

    it('title a draft that has no title yet', async () => {
      const empty = await payload.create({
        collection: 'articles',
        data: {},
        draft: true,
        overrideAccess: true,
      })
      expect((await findArticlePreview(payload, String(empty.id), asViewer(owner)))?.title).toBe(
        'Untitled',
      )
    })

    it('give staff the latest draft of a page', async () => {
      const page = await payload.create({
        collection: 'pages',
        data: { title: 'About', body: richText(paragraph('A draft page.')) },
        draft: true,
        overrideAccess: true,
      })
      expect(await findPagePreview(payload, String(page.id), asViewer(owner))).toMatchObject({
        title: 'About',
        slug: 'about',
      })
      expect(await findPagePreview(payload, String(page.id), null)).toBeNull()
    })
  })
})
