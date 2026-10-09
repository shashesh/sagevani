import { getPayload, ValidationError, type Payload, type Where } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { BODY_LINKS_MESSAGE } from '@/collections/shared/body-links'
import { DEFAULT_TAGLINE } from '@/globals/SiteSettings'
import config from '@/payload.config'
import type { DifficultyLevel, User } from '@/payload-types'

import {
  ASSISTANT_KEY,
  PASSWORD,
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

/** The paths and messages a refused save reports (a ValidationError's message is generic). */
async function fieldErrors(
  attempt: Promise<unknown>,
): Promise<{ path: string; message: string }[]> {
  const error = await attempt.then(
    () => undefined,
    (thrown: unknown) => thrown,
  )
  if (!(error instanceof ValidationError)) {
    throw new Error(`Expected a ValidationError, got ${String(error)}`)
  }
  return error.data.errors.map(({ path, message }) => ({ path, message }))
}

const errorPaths = async (attempt: Promise<unknown>) =>
  (await fieldErrors(attempt)).map(({ path }) => path)

const ONLY_PUBLISHED = 'Only published articles can be added here.'

const currentSettings = () =>
  payload.findGlobal({ slug: 'siteSettings', depth: 0, overrideAccess: true })

const unpublish = (target: { id: number } | { where: Where }) =>
  payload.update({
    collection: 'articles',
    ...target,
    data: { _status: 'draft' },
    user: owner,
    overrideAccess: false,
  } as Parameters<typeof payload.update>[0])

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
      expect(await fieldErrors(saveSettings({ featuredArticle: draft.id }))).toEqual([
        { path: 'featuredArticle', message: ONLY_PUBLISHED },
      ])
      expect(await fieldErrors(saveSettings({ featuredPicks: [draft.id] }))).toEqual([
        { path: 'featuredPicks', message: ONLY_PUBLISHED },
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
      expect(await fieldErrors(saveSettings({ featuredPicks: ids }))).toEqual([
        { path: 'featuredPicks', message: 'Choose at most 3.' },
      ])
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
      expect(await fieldErrors(saveSettings({ startHere: [draft.id] }))).toEqual([
        { path: 'startHere', message: ONLY_PUBLISHED },
      ])
    })

    it.each([
      ['featuredArticle', 'abc'],
      ['featuredArticle', true],
      ['featuredArticle', { foo: 1 }],
      ['featuredPicks', ['abc']],
      ['startHere', ['abc']],
      ['startHere', [{ foo: 1 }]],
      ['startHere', [null]],
      ['startHere', [[1]]],
      ['startHere', [true]],
      ['startHere', ['99999999999']],
      ['startHere', [0]],
    ])('refuse %s set to %j as not an article', async (field, value) => {
      expect(await fieldErrors(saveSettings({ [field]: value }))).toEqual([
        { path: field, message: 'Not a valid article.' },
      ])
    })

    it('answer a malformed article id over REST with 400, not 500', async () => {
      const { token } = await payload.login({
        collection: 'users',
        data: { email: 'owner@example.com', password: PASSWORD },
      })
      const response = await rest('POST', 'globals/siteSettings', {
        token: token ?? '',
        body: { featuredArticle: 'abc' },
      })
      expect(response.status).toBe(400)
    })

    it.each(['featuredPicks', 'startHere'])('list an article once in %s', async (field) => {
      const live = await article('Live', 'published')
      expect(await fieldErrors(saveSettings({ [field]: [live.id, live.id] }))).toEqual([
        { path: field, message: 'Each article can be listed once.' },
      ])
    })

    it('accept an article id sent as digits', async () => {
      const live = await article('Live', 'published')
      const settings = await saveSettings({ featuredArticle: String(live.id) })
      const featured = settings.featuredArticle
      expect(typeof featured === 'object' ? featured?.id : featured).toBe(live.id)
    })

    it('accept no featured article at all', async () => {
      const settings = await saveSettings({ featuredArticle: null })
      expect(settings.featuredArticle ?? null).toBeNull()
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

    it('keep an article listed when it is unpublished, and never block a save', async () => {
      const live = await article('Live', 'published')
      const other = await article('Other', 'published')
      await saveSettings({
        featuredArticle: live.id,
        featuredPicks: [live.id, other.id],
        startHere: [other.id, live.id],
      })

      await unpublish({ id: live.id })

      const settings = await currentSettings()
      const featured = settings.featuredArticle
      expect(typeof featured === 'object' ? featured?.id : featured).toBe(live.id)
      expect(settings.featuredPicks).toEqual([live.id, other.id])
      expect(settings.startHere).toEqual([other.id, live.id])
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

      await unpublish({ where: { id: { in: ids } } })

      for (const id of ids) {
        const row = await payload.findByID({ collection: 'articles', id, overrideAccess: true })
        expect(row._status).toBe('draft')
      }
      const settings = await currentSettings()
      expect(settings.featuredArticle).toBe(a.id)
      expect(settings.featuredPicks).toEqual([b.id, c.id])
      expect(settings.startHere).toEqual(ids)
      expect(settings.tagline).toBe('A tagline')
      expect(settings.navigation?.map(({ label, path }) => ({ label, path }))).toEqual([
        { label: 'Here', path: '/articles' },
      ])
      const saved = await saveSettings({ footerMotto: 'Still saves' })
      expect(saved.footerMotto).toBe('Still saves')
    })

    it('keep an unpublished article in place for when it is published again', async () => {
      const [a, b] = await Promise.all(['a', 'b'].map((title) => article(title, 'published')))
      await saveSettings({ startHere: [a.id, b.id] })
      await unpublish({ id: a.id })
      await payload.update({
        collection: 'articles',
        id: a.id,
        data: { _status: 'published' },
        overrideAccess: false,
        user: owner,
      })
      expect((await currentSettings()).startHere).toEqual([a.id, b.id])
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
