import { getPayload, ValidationError, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { OWNER_PUBLISHES_MESSAGE } from '@/collections/articles/approval'
import { PUBLISH_MESSAGES } from '@/lib/publish-rules'
import config from '@/payload.config'
import type { Article, DifficultyLevel, User } from '@/payload-types'

import { ASSISTANT_KEY, clearContent, createStaff, rest } from '../helpers/content'
import { image, paragraph, richText } from '../helpers/lexical'

let payload: Payload
let owner: User
let beginner: DifficultyLevel
let advanced: DifficultyLevel

type ArticleData = Partial<Omit<Article, 'id' | 'updatedAt' | 'createdAt'>>

const publish = (data: ArticleData) =>
  payload.create({
    collection: 'articles',
    data: { title: 'An article', shape: 'vani-note', ...data, _status: 'published' } as Article,
    overrideAccess: false,
    user: owner,
  })

const allVersions = async () => {
  const { docs } = await payload.findVersions({
    collection: 'articles',
    pagination: false,
    limit: 0,
    overrideAccess: true,
  })
  return docs
}

/**
 * Runs a publish and returns the one version it created. Computed as the set difference of the
 * version ids before and after, so it does not depend on how versions sort.
 */
const publishedVersionOf = async <T>(action: () => Promise<T>) => {
  const before = new Set((await allVersions()).map((version) => String(version.id)))
  const result = await action()
  const created = (await allVersions()).filter((version) => !before.has(String(version.id)))
  expect(created).toHaveLength(1)
  return { result, version: created[0] }
}

const liveRow = (id: number) =>
  payload.findByID({ collection: 'articles', id, overrideAccess: true })

/** The rule problems a publish attempt fails with, as `{ path, message }` pairs. */
const problemsOf = async (attempt: Promise<unknown>) => {
  const error = await attempt.then(
    () => undefined,
    (thrown: unknown) => thrown,
  )
  expect(error).toBeInstanceOf(ValidationError)
  return (error as ValidationError).data.errors.map(({ path, message }) => ({ path, message }))
}

describe('articles: publishing', () => {
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
      data: { name: 'Advanced', order: 3, needsPriorReading: true },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  describe('the approval record', () => {
    it('records the approver, the time and the published version', async () => {
      const { result: article, version } = await publishedVersionOf(() =>
        publish({ difficulty: beginner.id, summary: 'One line.' }),
      )
      const stored = await liveRow(article.id)

      expect(stored.approval?.versionId).toBe(String(version.id))
      expect(version.version.title).toBe(stored.title)
      const approvedBy = stored.approval?.approvedBy
      expect(typeof approvedBy === 'object' ? approvedBy?.id : approvedBy).toBe(owner.id)
      expect(stored.approval?.approvedAt).toBeTruthy()
      expect(stored.publishedAt).toBeTruthy()
      expect(stored.summary).toBe('One line.')
    })

    it('keeps publishedAt from the first publish and records a new approval each time', async () => {
      const first = await publish({ difficulty: beginner.id })
      const { result: second, version } = await publishedVersionOf(() =>
        payload.update({
          collection: 'articles',
          id: first.id,
          data: { title: 'Edited', _status: 'published' },
          overrideAccess: false,
          user: owner,
        }),
      )
      expect(second.publishedAt).toBe(first.publishedAt)
      expect(second.approval?.versionId).not.toBe(first.approval?.versionId)
      expect(second.approval?.versionId).toBe(String(version.id))
      expect(version.version.title).toBe('Edited')
    })

    it('is not changed by a later draft', async () => {
      const article = await publish({ difficulty: beginner.id })
      const response = await rest('PATCH', `articles/${article.id}?draft=true`, {
        key: ASSISTANT_KEY,
        body: { title: 'Proposed' },
      })
      expect(response.status).toBe(200)
      const stored = await liveRow(article.id)
      expect(stored.approval?.versionId).toBe(article.approval?.versionId)
    })

    it('names each of two publishes in a row, with its own version', async () => {
      const first = await publishedVersionOf(() => publish({ difficulty: beginner.id }))
      const second = await publishedVersionOf(() =>
        payload.update({
          collection: 'articles',
          id: first.result.id,
          data: { title: 'Second', _status: 'published' },
          overrideAccess: false,
          user: owner,
        }),
      )
      expect(first.result.approval?.versionId).toBe(String(first.version.id))
      expect(second.result.approval?.versionId).toBe(String(second.version.id))
      expect((await liveRow(first.result.id)).approval?.versionId).toBe(String(second.version.id))
    })

    it('names the new version made by restoring an older published one', async () => {
      const first = await publishedVersionOf(() =>
        publish({ title: 'First', difficulty: beginner.id }),
      )
      await payload.update({
        collection: 'articles',
        id: first.result.id,
        data: { title: 'Second', _status: 'published' },
        overrideAccess: false,
        user: owner,
      })
      const restored = await publishedVersionOf(() =>
        payload.restoreVersion({
          collection: 'articles',
          id: String(first.version.id),
          overrideAccess: false,
          user: owner,
        }),
      )
      const stored = await liveRow(first.result.id)
      expect(restored.version.id).not.toBe(first.version.id)
      expect(stored.approval?.versionId).toBe(String(restored.version.id))
      expect(restored.version.version.title).toBe('First')
      expect(stored.title).toBe('First')
    })

    it('is recorded when the publish asks for only some fields back', async () => {
      const article = await publish({ difficulty: beginner.id })
      await payload.update({
        collection: 'articles',
        id: article.id,
        data: { title: 'Selected', _status: 'published' },
        select: { title: true },
        overrideAccess: false,
        user: owner,
      })
      const stored = await liveRow(article.id)
      expect(stored.approval?.versionId).toBeTruthy()
      expect(stored.approval?.versionId).not.toBe(article.approval?.versionId)
    })

    it('is kept by the admin unpublish', async () => {
      const article = await publish({ difficulty: beginner.id })
      await payload.update({
        collection: 'articles',
        id: article.id,
        data: { _status: 'draft' },
        unpublishAllLocales: true,
        overrideAccess: false,
        user: owner,
      })
      const stored = await liveRow(article.id)
      expect(stored._status).toBe('draft')
      expect(stored.publishedAt).toBe(article.publishedAt)
      expect(stored.approval).toEqual(article.approval)
    })

    it('cannot be forged through the Local API, even across an unpublish and a republish', async () => {
      const article = await publish({ difficulty: beginner.id })
      await payload.update({
        collection: 'articles',
        id: article.id,
        data: {
          title: 'Forger',
          approval: { versionId: 'forged' },
          publishedAt: '2000-01-01T00:00:00.000Z',
        },
        draft: true,
        overrideAccess: true,
      })
      expect((await liveRow(article.id)).approval?.versionId).toBe(article.approval?.versionId)
      await payload.update({
        collection: 'articles',
        id: article.id,
        data: { _status: 'draft' },
        unpublishAllLocales: true,
        overrideAccess: false,
        user: owner,
      })
      const republished = await payload.update({
        collection: 'articles',
        id: article.id,
        data: { _status: 'published' },
        overrideAccess: false,
        user: owner,
      })
      const stored = await liveRow(article.id)
      expect(stored.approval?.versionId).not.toBe('forged')
      expect(republished.approval?.versionId).not.toBe('forged')
      expect(stored.publishedAt).toBe(article.publishedAt)
    })

    it('is refused when nobody is signed in', async () => {
      await expect(
        payload.create({
          collection: 'articles',
          data: {
            title: 'Anon',
            shape: 'vani-note',
            difficulty: beginner.id,
            _status: 'published',
          },
          overrideAccess: true,
        }),
      ).rejects.toThrow(OWNER_PUBLISHES_MESSAGE)
    })

    it('lets a bare publish rely on the stored difficulty and shape', async () => {
      const article = await publish({ difficulty: beginner.id })
      await payload.update({
        collection: 'articles',
        id: article.id,
        data: { title: 'Changed' },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      const republished = await payload.update({
        collection: 'articles',
        id: article.id,
        data: { _status: 'published' },
        overrideAccess: false,
        user: owner,
      })
      expect(republished._status).toBe('published')
      expect(republished.title).toBe('Changed')
    })

    it('leaves the live row and its approval alone when a publish is refused', async () => {
      const article = await publish({ difficulty: beginner.id })
      const before = await liveRow(article.id)
      const attempt = payload.update({
        collection: 'articles',
        id: article.id,
        data: { difficulty: null, title: 'Half done', _status: 'published' },
        overrideAccess: false,
        user: owner,
      })
      expect(await problemsOf(attempt)).toEqual([
        { path: 'difficulty', message: PUBLISH_MESSAGES.difficulty },
      ])
      const after = await liveRow(article.id)
      expect(after.title).toBe(before.title)
      expect(after.approval).toEqual(before.approval)
      expect(after.publishedAt).toBe(before.publishedAt)
    })

    it('is not made when saving a draft', async () => {
      const article = await payload.create({
        collection: 'articles',
        data: { title: 'Draft' },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      expect(article.approval?.approvedAt ?? null).toBeNull()
      expect(article.publishedAt ?? null).toBeNull()
    })
  })

  describe('the publish rules', () => {
    it('need a difficulty level', async () => {
      expect(await problemsOf(publish({}))).toEqual([
        { path: 'difficulty', message: PUBLISH_MESSAGES.difficulty },
      ])
    })

    it('need a prior reading when the level asks for one', async () => {
      expect(await problemsOf(publish({ difficulty: advanced.id }))).toEqual([
        { path: 'readFirst', message: PUBLISH_MESSAGES.readFirst },
      ])
      const article = await publish({
        difficulty: advanced.id,
        readFirst: [{ kind: 'external', title: 'Bhagavad Gītā, chapter 2' }],
      })
      expect(article._status).toBe('published')
    })

    it('need a source for a Text / Story Study, and list every problem at once', async () => {
      const problems = await problemsOf(
        publish({ shape: 'text-story-study', difficulty: advanced.id }),
      )
      expect(problems.map((problem) => problem.path)).toEqual(['readFirst', 'sources'])
    })

    it('need alt text on every image in the body', async () => {
      const data = await sharp({
        create: { width: 10, height: 10, channels: 3, background: '#000' },
      })
        .png()
        .toBuffer()
      const blank = await payload.create({
        collection: 'media',
        data: { alt: '   ', creator: 'c', source: 's', licence: 'l' },
        file: { data, mimetype: 'image/png', name: 'x.png', size: data.length },
        overrideAccess: true,
      })
      expect(
        await problemsOf(
          publish({ difficulty: beginner.id, body: richText(paragraph('Text.'), image(blank.id)) }),
        ),
      ).toEqual([{ path: 'body', message: PUBLISH_MESSAGES.imageAlt(blank.id) }])
    })

    it('do not apply to drafts', async () => {
      const article = await payload.create({
        collection: 'articles',
        data: { title: 'Unfinished', shape: 'text-story-study' },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      expect(article._status).toBe('draft')
    })
  })
})
