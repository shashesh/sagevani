import { getPayload, ValidationError, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { BODY_LINKS_MESSAGE } from '@/collections/shared/body-links'
import { DRAFTS_ONLY_MESSAGE } from '@/collections/articles/drafts-only'
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

const publishAsOwner = (title = 'Live') =>
  payload.create({
    collection: 'articles',
    data: { title, shape: 'vani-note', difficulty: level.id, _status: 'published' },
    overrideAccess: false,
    user: owner,
  })

const live = (id: number) => payload.findByID({ collection: 'articles', id, overrideAccess: true })

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

const bodyOf = (...children: Record<string, unknown>[]) => ({
  root: {
    type: 'root',
    version: 1,
    format: '' as const,
    indent: 0,
    direction: 'ltr' as const,
    children,
  },
})

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
      await expectRefused(await rest('DELETE', `articles/${article.id}`, { key: ASSISTANT_KEY }))
      expect((await live(article.id)).id).toBe(article.id)
    })

    it('is refused restoring a version even with ?draft=true', async () => {
      const article = await publishAsOwner()
      const versions = await payload.findVersions({
        collection: 'articles',
        where: { parent: { equals: article.id } },
        overrideAccess: true,
      })
      await expectRefused(
        await rest('POST', `articles/versions/${versions.docs[0].id}?draft=true`, {
          key: ASSISTANT_KEY,
        }),
      )
    })

    it.each([
      'unpublishAllLocales=true',
      'publishAllLocales=true',
      'publishSpecificLocale=en',
      'autosave=true',
    ])('is refused ?draft=true&%s', async (flag) => {
      const article = await publishAsOwner()
      await expectRefused(
        await rest('PATCH', `articles/${article.id}?draft=true&${flag}`, {
          key: ASSISTANT_KEY,
          body: { title: 'Assistant text' },
        }),
      )
    })

    it('only ever adds a version, leaving the published one untouched', async () => {
      const article = await publishAsOwner('Approved text')
      const findAll = () =>
        payload.findVersions({
          collection: 'articles',
          where: { parent: { equals: article.id } },
          sort: 'createdAt',
          overrideAccess: true,
        })
      const before = await findAll()
      const published = before.docs[before.docs.length - 1]

      const response = await rest('PATCH', `articles/${article.id}?draft=true`, {
        key: ASSISTANT_KEY,
        body: { title: 'Proposed', _status: 'draft' },
      })
      expect(response.status).toBe(200)

      const after = await findAll()
      expect(after.docs).toHaveLength(before.docs.length + 1)
      const same = after.docs.find((version) => version.id === published.id)
      expect(same?.version.title).toBe('Approved text')
      expect(same?.version._status).toBe('published')
    })

    it('cannot change server-only fields or the checklist on update either', async () => {
      const article = await publishAsOwner()
      await payload.update({
        collection: 'articles',
        id: article.id,
        data: { editorialChecklist: { integrity: { quotesLocated: true } } },
        overrideAccess: false,
        user: owner,
      })
      const response = await rest('PATCH', `articles/${article.id}?draft=true`, {
        key: ASSISTANT_KEY,
        body: {
          approval: null,
          publishedAt: null,
          readingTime: 99,
          searchText: 'x',
          emailRecipients: 5,
          editorialChecklist: { integrity: { quotesLocated: false } },
        },
      })
      expect(response.status).toBe(200)
      const latest = await payload.findByID({
        collection: 'articles',
        id: article.id,
        draft: true,
        overrideAccess: true,
      })
      expect(latest.editorialChecklist?.integrity?.quotesLocated).toBe(true)
      expect(latest.emailRecipients).not.toBe(5)
      expect(latest.readingTime).not.toBe(99)
    })

    it('is refused a body that links to anything but an article', async () => {
      const response = await rest('POST', 'articles?draft=true', {
        key: ASSISTANT_KEY,
        body: { title: 'Linked', body: bodyLinkingTo('users', owner.id) },
      })
      expect(response.status).toBe(400)
      expect(JSON.stringify(await response.json())).toContain(BODY_LINKS_MESSAGE)
    })

    it('is refused a body link to anything but an article, for the owner too', async () => {
      expect(
        await validationMessages(
          payload.create({
            collection: 'articles',
            data: { title: 'Linked', body: bodyLinkingTo('users', owner.id) },
            draft: true,
            overrideAccess: false,
            user: owner,
          }),
        ),
      ).toEqual([BODY_LINKS_MESSAGE])
    })

    it('accepts a body that links to another article', async () => {
      const target = await publishAsOwner('Target')
      const response = await rest('POST', 'articles?draft=true', {
        key: ASSISTANT_KEY,
        body: { title: 'Linked', body: bodyLinkingTo('articles', target.id) },
      })
      expect(response.status).toBe(201)
    })

    it('accepts a body with an external link that has no doc', async () => {
      const response = await rest('POST', 'articles?draft=true', {
        key: ASSISTANT_KEY,
        body: {
          title: 'External',
          body: bodyOf({
            type: 'link',
            version: 3,
            fields: { linkType: 'custom', newTab: false, url: 'https://example.com' },
            children: [],
          }),
        },
      })
      expect(response.status).toBe(201)
    })

    const usersDoc = (owner: User) => ({ relationTo: 'users', value: owner.id })
    it.each([
      [
        'B2: an internal link with an array relationTo',
        (o: User) => ({
          type: 'link',
          fields: { linkType: 'internal', doc: { relationTo: ['users'], value: o.id } },
        }),
      ],
      [
        'B3: a custom link that carries a doc',
        (o: User) => ({
          type: 'link',
          fields: { linkType: 'custom', url: 'https://example.com', doc: usersDoc(o) },
        }),
      ],
      [
        'B4: a link with no linkType that carries a doc',
        (o: User) => ({ type: 'link', fields: { doc: usersDoc(o) } }),
      ],
      [
        'B5: a link with linkType Internal that carries a doc',
        (o: User) => ({ type: 'link', fields: { linkType: 'Internal', doc: usersDoc(o) } }),
      ],
      [
        'B9: an upload with an array relationTo',
        (o: User) => ({ type: 'upload', relationTo: ['users'], value: o.id }),
      ],
      [
        'B11: a relationship with an array relationTo',
        (o: User) => ({ type: 'relationship', relationTo: ['users'], value: o.id }),
      ],
    ])('refuses %s', async (_name, makeNode) => {
      const response = await rest('POST', 'articles?draft=true', {
        key: ASSISTANT_KEY,
        body: { title: 'Sneaky', body: bodyOf(makeNode(owner)) },
      })
      expect(response.status).toBe(400)
      expect(JSON.stringify(await response.json())).toContain(BODY_LINKS_MESSAGE)
    })

    it('refuses a link whose doc is a forged populated object, not an id', async () => {
      const target = await publishAsOwner('Target')
      const response = await rest('POST', 'articles?draft=true', {
        key: ASSISTANT_KEY,
        body: {
          title: 'Forged',
          body: bodyOf({
            type: 'link',
            fields: {
              linkType: 'internal',
              doc: {
                relationTo: 'articles',
                value: { id: target.id, slug: '//evil.example', title: 'Fake' },
              },
            },
            children: [],
          }),
        },
      })
      expect(response.status).toBe(400)
      expect(JSON.stringify(await response.json())).toContain(BODY_LINKS_MESSAGE)
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
      expect(docs[0]).toHaveProperty('publishedAt')
    })

    it('cannot update or delete anonymously', async () => {
      const article = await publishAsOwner()
      expect(
        (await rest('PATCH', `articles/${article.id}?draft=true`, { body: { title: 'x' } })).status,
      ).toBe(403)
      expect((await rest('DELETE', `articles/${article.id}`)).status).toBe(403)
      expect((await live(article.id)).title).toBe('Live')
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
      expect(unpublished.approval).toEqual(article.approval)
      expect((await rest('GET', 'articles')).ok).toBe(true)
      expect((await (await rest('GET', 'articles')).json()).docs).toEqual([])
    })

    it('cannot publish with a prior reading that is only a draft', async () => {
      const draft = await payload.create({
        collection: 'articles',
        data: { title: 'Unfinished' },
        draft: true,
        overrideAccess: true,
      })
      const attempt = payload.create({
        collection: 'articles',
        data: {
          title: 'Reads a draft',
          shape: 'vani-note',
          difficulty: level.id,
          readFirst: [{ kind: 'internal', article: draft.id }],
          _status: 'published',
        },
        overrideAccess: false,
        user: owner,
      })
      const error = await attempt.then(
        () => undefined,
        (thrown: unknown) => thrown,
      )
      expect(error).toBeInstanceOf(ValidationError)
      const paths = (error as ValidationError).data.errors.map(({ path }) => path)
      expect(paths.some((path) => path.startsWith('readFirst.0.article'))).toBe(true)
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
