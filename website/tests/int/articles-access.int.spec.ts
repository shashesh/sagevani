import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { DRAFTS_ONLY_MESSAGE } from '@/collections/articles/drafts-only'
import config from '@/payload.config'
import type { DifficultyLevel, User } from '@/payload-types'

import { ASSISTANT_KEY, clearContent, createStaff, rest } from '../helpers/content'

let payload: Payload
let owner: User
let level: DifficultyLevel

const publishAsOwner = (title = 'Live') =>
  payload.create({
    collection: 'articles',
    data: { title, shape: 'vani-note', difficulty: level.id, _status: 'published' },
    overrideAccess: false,
    user: owner,
  })

const live = (id: number) => payload.findByID({ collection: 'articles', id, overrideAccess: true })

const expectRefused = async (response: Response) => {
  expect(response.status).toBe(403)
  expect(JSON.stringify(await response.json())).toContain(DRAFTS_ONLY_MESSAGE)
}

describe('articles: who can do what', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearContent(payload)
    ;({ owner } = await createStaff(payload))
    level = await payload.create({
      collection: 'difficultyLevels',
      data: { name: 'Beginner', order: 1, needsPriorReading: false },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  describe('the assistant', () => {
    it('creates a draft through REST with ?draft=true', async () => {
      const response = await rest('POST', 'articles?draft=true', {
        key: ASSISTANT_KEY,
        body: { title: 'A draft' },
      })
      expect(response.status).toBe(201)
      expect((await response.json()).doc._status).toBe('draft')
    })

    it('cannot set the approval, publishedAt or the editorial checklist', async () => {
      const response = await rest('POST', 'articles?draft=true', {
        key: ASSISTANT_KEY,
        body: {
          title: 'Forged',
          approval: { versionId: 'forged', approvedAt: '2020-01-01T00:00:00.000Z' },
          publishedAt: '2020-01-01T00:00:00.000Z',
          emailSentAt: '2020-01-01T00:00:00.000Z',
          editorialChecklist: { integrity: { quotesLocated: true } },
        },
      })
      const { doc } = await response.json()
      const stored = await payload.findByID({
        collection: 'articles',
        id: doc.id,
        draft: true,
        overrideAccess: true,
      })
      expect(stored.approval?.versionId ?? null).toBeNull()
      expect(stored.approval?.approvedAt ?? null).toBeNull()
      expect(stored.publishedAt ?? null).toBeNull()
      expect(stored.emailSentAt ?? null).toBeNull()
      expect(stored.editorialChecklist?.integrity?.quotesLocated ?? false).toBe(false)
    })

    it('is refused a save without ?draft=true', async () => {
      await expectRefused(
        await rest('POST', 'articles', { key: ASSISTANT_KEY, body: { title: 'x' } }),
      )
    })

    it('is refused publishing, even with ?draft=true', async () => {
      await expectRefused(
        await rest('POST', 'articles?draft=true', {
          key: ASSISTANT_KEY,
          body: { title: 'x', _status: 'published' },
        }),
      )
    })

    it('drafts over a published article without changing the live one', async () => {
      const article = await publishAsOwner('Live title')
      const response = await rest('PATCH', `articles/${article.id}?draft=true`, {
        key: ASSISTANT_KEY,
        body: { title: 'Proposed title' },
      })
      expect(response.status).toBe(200)

      const current = await live(article.id)
      expect(current.title).toBe('Live title')
      expect(current._status).toBe('published')
      const latest = await payload.findByID({
        collection: 'articles',
        id: article.id,
        draft: true,
        overrideAccess: true,
      })
      expect(latest.title).toBe('Proposed title')
    })

    it('is refused an update without ?draft=true, which would unpublish', async () => {
      const article = await publishAsOwner()
      await expectRefused(
        await rest('PATCH', `articles/${article.id}`, {
          key: ASSISTANT_KEY,
          body: { _status: 'draft' },
        }),
      )
      expect((await live(article.id))._status).toBe('published')
    })

    it('is refused restoring a version, duplicating and bulk updates', async () => {
      const article = await publishAsOwner()
      const versions = await payload.findVersions({
        collection: 'articles',
        where: { parent: { equals: article.id } },
        overrideAccess: true,
      })
      await expectRefused(
        await rest('POST', `articles/versions/${versions.docs[0].id}`, { key: ASSISTANT_KEY }),
      )
      await expectRefused(
        await rest('POST', `articles/${article.id}/duplicate?draft=true`, {
          key: ASSISTANT_KEY,
          body: {},
        }),
      )
      await expectRefused(
        await rest('PATCH', `articles?draft=true&where[id][equals]=${article.id}`, {
          key: ASSISTANT_KEY,
          body: { title: 'bulk' },
        }),
      )
    })

    it('is refused deleting', async () => {
      const article = await publishAsOwner()
      expect((await rest('DELETE', `articles/${article.id}`, { key: ASSISTANT_KEY })).status).toBe(
        403,
      )
      expect((await live(article.id)).id).toBe(article.id)
    })

    it('reads drafts and versions', async () => {
      await payload.create({
        collection: 'articles',
        data: { title: 'Draft' },
        draft: true,
        overrideAccess: true,
      })
      const drafts = await (await rest('GET', 'articles?draft=true', { key: ASSISTANT_KEY })).json()
      expect(drafts.docs.map((doc: { title: string }) => doc.title)).toEqual(['Draft'])
      expect((await rest('GET', 'articles/versions', { key: ASSISTANT_KEY })).status).toBe(200)
    })
  })

  describe('the public', () => {
    it('sees published articles only, without the approval, email record or checklist', async () => {
      await publishAsOwner('Live')
      await payload.create({
        collection: 'articles',
        data: { title: 'Draft' },
        draft: true,
        overrideAccess: true,
      })
      const { docs } = await (await rest('GET', 'articles')).json()
      expect(docs.map((doc: { title: string }) => doc.title)).toEqual(['Live'])
      expect(docs[0].approval).toBeUndefined()
      expect(docs[0].emailSentAt).toBeUndefined()
      expect(docs[0].emailRecipients).toBeUndefined()
      expect(docs[0].editorialChecklist).toBeUndefined()
      expect(docs[0].publishedAt).toBeDefined()
    })

    it('cannot read versions or write anything', async () => {
      expect((await rest('GET', 'articles/versions')).status).toBe(403)
      expect((await rest('POST', 'articles?draft=true', { body: { title: 'x' } })).status).toBe(403)
    })
  })

  describe('the owner', () => {
    it('unpublishes, keeping publishedAt and the approval', async () => {
      const article = await publishAsOwner()
      const unpublished = await payload.update({
        collection: 'articles',
        id: article.id,
        data: { _status: 'draft' },
        overrideAccess: false,
        user: owner,
      })
      expect(unpublished._status).toBe('draft')
      expect(unpublished.publishedAt).toBe(article.publishedAt)
      expect((await rest('GET', 'articles')).ok).toBe(true)
      expect((await (await rest('GET', 'articles')).json()).docs).toEqual([])
    })

    it('deletes', async () => {
      const article = await publishAsOwner()
      await payload.delete({
        collection: 'articles',
        id: article.id,
        overrideAccess: false,
        user: owner,
      })
      expect(
        (await payload.count({ collection: 'articles', overrideAccess: true })).totalDocs,
      ).toBe(0)
    })
  })
})
