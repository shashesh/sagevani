import { getPayload, ValidationError, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { BODY_LINKS_MESSAGE } from '@/collections/shared/body-links'
import { DEFAULT_TAGLINE } from '@/globals/SiteSettings'
import config from '@/payload.config'
import type { DifficultyLevel, User } from '@/payload-types'

import {
  ASSISTANT_KEY,
  clearContent,
  createStaff,
  rest,
  validationMessages,
} from '../helpers/content'

let payload: Payload
let owner: User
let level: DifficultyLevel

const article = (title: string, status: 'draft' | 'published') =>
  status === 'published'
    ? payload.create({
        collection: 'articles',
        data: { title, shape: 'vani-note', difficulty: level.id, _status: 'published' },
        user: owner,
        overrideAccess: false,
      })
    : payload.create({ collection: 'articles', data: { title }, draft: true, overrideAccess: true })

const bodyLinkingTo = (relationTo: string, id: number) => ({
  root: {
    type: 'root',
    version: 1,
    format: '' as const,
    indent: 0,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        version: 1,
        format: '',
        indent: 0,
        direction: 'ltr',
        textFormat: 0,
        children: [
          {
            type: 'link',
            version: 3,
            format: '',
            indent: 0,
            direction: 'ltr',
            fields: { linkType: 'internal', newTab: false, doc: { relationTo, value: id } },
            children: [
              {
                type: 'text',
                version: 1,
                text: 'link',
                format: 0,
                mode: 'normal',
                style: '',
                detail: 0,
              },
            ],
          },
        ],
      },
    ],
  },
})

const publishedPage = (title: string) =>
  payload.create({
    collection: 'pages',
    data: { title, _status: 'published' },
    overrideAccess: false,
    user: owner,
  })

/** The field paths a refused save reports (a ValidationError's message is generic). */
async function errorPaths(attempt: Promise<unknown>): Promise<string[]> {
  const error = await attempt.then(
    () => undefined,
    (thrown: unknown) => thrown,
  )
  if (!(error instanceof ValidationError)) {
    throw new Error(`Expected a ValidationError, got ${String(error)}`)
  }
  return error.data.errors.map(({ path }) => path)
}

const saveSettings = (data: Record<string, unknown>) =>
  payload.updateGlobal({ slug: 'siteSettings', data, overrideAccess: false, user: owner })

describe('pages and site settings', () => {
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
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  describe('pages', () => {
    it('reject a body that links to an account', async () => {
      const body = {
        root: {
          type: 'root',
          version: 1,
          format: '' as const,
          indent: 0,
          direction: 'ltr' as const,
          children: [
            {
              type: 'link',
              version: 3,
              fields: {
                linkType: 'internal',
                newTab: false,
                doc: { relationTo: 'users', value: owner.id },
              },
              children: [],
            },
          ],
        },
      }
      expect(
        await validationMessages(
          payload.create({
            collection: 'pages',
            data: { title: 'About', body },
            draft: true,
            overrideAccess: false,
            user: owner,
          }),
        ),
      ).toEqual([BODY_LINKS_MESSAGE])
    })

    it('keep a half-written page off the site until it is published', async () => {
      await payload.create({
        collection: 'pages',
        data: { title: 'About' },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      expect((await (await rest('GET', 'pages')).json()).docs).toEqual([])

      await payload.create({
        collection: 'pages',
        data: { title: 'How SageVani writes', _status: 'published' },
        overrideAccess: false,
        user: owner,
      })
      const { docs } = await (await rest('GET', 'pages')).json()
      expect(docs.map((page: { slug: string }) => page.slug)).toEqual(['how-sagevani-writes'])
    })

    it('let a page link to an article', async () => {
      const target = await article('Target', 'published')
      const page = await payload.create({
        collection: 'pages',
        data: { title: 'About', body: bodyLinkingTo('articles', target.id) },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      expect(page.id).toBeDefined()
    })

    it('let an owner article link to a published page', async () => {
      const page = await publishedPage('About')
      const saved = await payload.create({
        collection: 'articles',
        data: { title: 'Linked', body: bodyLinkingTo('pages', page.id) },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      expect(saved.id).toBeDefined()
    })

    it('let an assistant draft article link to a page', async () => {
      const page = await publishedPage('About')
      const response = await rest('POST', 'articles?draft=true', {
        key: ASSISTANT_KEY,
        body: { title: 'Linked', body: bodyLinkingTo('pages', page.id) },
      })
      expect(response.status).toBe(201)
    })

    it('are the owner’s alone to write, even as drafts', async () => {
      const response = await rest('POST', 'pages?draft=true', {
        key: ASSISTANT_KEY,
        body: { title: 'About' },
      })
      expect(response.status).toBe(403)
    })
  })

  describe('site settings', () => {
    it('ship with the tagline, readable by the public', async () => {
      const settings = await (await rest('GET', 'globals/siteSettings')).json()
      expect(settings.tagline).toBe(DEFAULT_TAGLINE)
      expect(DEFAULT_TAGLINE).toBe('Where silence learns to speak.')
    })

    it('are the owner’s alone to change', async () => {
      const response = await rest('POST', 'globals/siteSettings', {
        key: ASSISTANT_KEY,
        body: { footerMotto: 'x' },
      })
      expect(response.status).toBe(403)
    })

    it('feature published articles only', async () => {
      const draft = await article('Draft', 'draft')
      expect(await errorPaths(saveSettings({ featuredArticle: draft.id }))).toEqual([
        'featuredArticle',
      ])

      const live = await article('Live', 'published')
      const settings = await payload.updateGlobal({
        slug: 'siteSettings',
        data: { featuredArticle: live.id },
        overrideAccess: false,
        user: owner,
      })
      const featured = settings.featuredArticle
      expect(typeof featured === 'object' ? featured?.id : featured).toBe(live.id)
    })

    it('hold at most three featured picks', async () => {
      const ids = await Promise.all(
        ['a', 'b', 'c', 'd'].map(async (t) => (await article(t, 'published')).id),
      )
      expect(await errorPaths(saveSettings({ featuredPicks: ids }))).toEqual(['featuredPicks'])
    })

    it('accept three featured picks', async () => {
      const ids = await Promise.all(
        ['a', 'b', 'c'].map(async (t) => (await article(t, 'published')).id),
      )
      const settings = await saveSettings({ featuredPicks: ids })
      expect(settings.featuredPicks).toHaveLength(3)
    })

    it('list published articles only in start here', async () => {
      const draft = await article('Draft', 'draft')
      expect(await errorPaths(saveSettings({ startHere: [draft.id] }))).toEqual(['startHere'])
    })

    it.each(['/\\evil.com', '//evil.com', 'javascript:alert(1)', 'https://example.com', '/a b'])(
      'refuse the navigation path %s',
      async (path) => {
        expect(await errorPaths(saveSettings({ navigation: [{ label: 'Away', path }] }))).toEqual([
          'navigation.0.path',
        ])
      },
    )

    it.each(['/articles', '/start-here', '/'])('accept the navigation path %s', async (path) => {
      const settings = await saveSettings({ navigation: [{ label: 'Here', path }] })
      expect(settings.navigation?.[0]?.path).toBe(path)
    })

    it('drop an article from the settings when it is unpublished', async () => {
      const live = await article('Live', 'published')
      const other = await article('Other', 'published')
      await saveSettings({
        featuredArticle: live.id,
        featuredPicks: [live.id, other.id],
        startHere: [other.id, live.id],
      })

      await payload.update({
        collection: 'articles',
        id: live.id,
        data: { _status: 'draft' },
        overrideAccess: false,
        user: owner,
      })

      const settings = await payload.findGlobal({
        slug: 'siteSettings',
        depth: 0,
        overrideAccess: true,
      })
      expect(settings.featuredArticle ?? null).toBeNull()
      expect(settings.featuredPicks).toEqual([other.id])
      expect(settings.startHere).toEqual([other.id])
      const saved = await saveSettings({ footerMotto: 'Still saves' })
      expect(saved.footerMotto).toBe('Still saves')
    })

    it('let the owner unpublish several featured articles at once', async () => {
      const [a, b, c] = await Promise.all(
        ['a', 'b', 'c'].map((title) => article(title, 'published')),
      )
      const ids = [a.id, b.id, c.id]
      await saveSettings({
        tagline: 'A tagline',
        footerMotto: 'A motto',
        navigation: [{ label: 'Here', path: '/articles' }],
        featuredArticle: a.id,
        featuredPicks: [b.id, c.id],
        startHere: ids,
      })

      await payload.update({
        collection: 'articles',
        where: { id: { in: ids } },
        data: { _status: 'draft' },
        user: owner,
        overrideAccess: false,
      })

      for (const id of ids) {
        const row = await payload.findByID({ collection: 'articles', id, overrideAccess: true })
        expect(row._status).toBe('draft')
      }
      const settings = await payload.findGlobal({
        slug: 'siteSettings',
        depth: 0,
        overrideAccess: true,
      })
      expect(settings.featuredArticle ?? null).toBeNull()
      expect(settings.featuredPicks ?? []).toEqual([])
      expect(settings.startHere ?? []).toEqual([])
      expect(settings.tagline).toBe('A tagline')
      expect(settings.footerMotto).toBe('A motto')
      expect(settings.navigation?.map(({ label, path }) => ({ label, path }))).toEqual([
        { label: 'Here', path: '/articles' },
      ])
    })

    it('let the owner delete the featured article', async () => {
      const live = await article('Live', 'published')
      await saveSettings({ featuredArticle: live.id })

      await payload.delete({
        collection: 'articles',
        id: live.id,
        user: owner,
        overrideAccess: false,
      })

      const settings = await payload.findGlobal({
        slug: 'siteSettings',
        depth: 0,
        overrideAccess: true,
      })
      expect(settings.featuredArticle ?? null).toBeNull()
      const saved = await saveSettings({ footerMotto: 'Still saves' })
      expect(saved.footerMotto).toBe('Still saves')
    })
  })
})
