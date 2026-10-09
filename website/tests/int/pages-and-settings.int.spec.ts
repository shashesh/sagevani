import { getPayload, type Payload } from 'payload'
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
      data: { featuredArticle: null, featuredPicks: [], startHere: [] },
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
      await expect(
        payload.updateGlobal({
          slug: 'siteSettings',
          data: { featuredArticle: draft.id },
          overrideAccess: false,
          user: owner,
        }),
      ).rejects.toThrow(/featured ?article/i)

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
      await expect(
        payload.updateGlobal({
          slug: 'siteSettings',
          data: { featuredPicks: ids },
          overrideAccess: false,
          user: owner,
        }),
      ).rejects.toThrow(/featured ?picks/i)
    })

    it('accept only site paths in the navigation', async () => {
      await expect(
        payload.updateGlobal({
          slug: 'siteSettings',
          data: { navigation: [{ label: 'Away', path: 'https://example.com' }] },
          overrideAccess: false,
          user: owner,
        }),
      ).rejects.toThrow(/path/i)
    })
  })
})
