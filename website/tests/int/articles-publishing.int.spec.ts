import { getPayload, ValidationError, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

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

const newestVersionId = async (id: number) => {
  const { docs } = await payload.findVersions({
    collection: 'articles',
    where: { parent: { equals: id } },
    sort: '-createdAt',
    limit: 1,
    overrideAccess: true,
  })
  return String(docs[0].id)
}

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
      const article = await publish({ difficulty: beginner.id, summary: 'One line.' })
      const stored = await payload.findByID({
        collection: 'articles',
        id: article.id,
        overrideAccess: true,
      })

      expect(stored.approval?.versionId).toBe(await newestVersionId(article.id))
      const approvedBy = stored.approval?.approvedBy
      expect(typeof approvedBy === 'object' ? approvedBy?.id : approvedBy).toBe(owner.id)
      expect(stored.approval?.approvedAt).toBeTruthy()
      expect(stored.publishedAt).toBeTruthy()
      expect(stored.summary).toBe('One line.')
    })

    it('keeps publishedAt from the first publish and records a new approval each time', async () => {
      const first = await publish({ difficulty: beginner.id })
      const second = await payload.update({
        collection: 'articles',
        id: first.id,
        data: { title: 'Edited', _status: 'published' },
        overrideAccess: false,
        user: owner,
      })
      expect(second.publishedAt).toBe(first.publishedAt)
      expect(second.approval?.versionId).not.toBe(first.approval?.versionId)
      expect(second.approval?.versionId).toBe(await newestVersionId(first.id))
    })

    it('is not changed by a later draft', async () => {
      const article = await publish({ difficulty: beginner.id })
      await rest('PATCH', `articles/${article.id}?draft=true`, {
        key: ASSISTANT_KEY,
        body: { title: 'Proposed' },
      })
      const stored = await payload.findByID({
        collection: 'articles',
        id: article.id,
        overrideAccess: true,
      })
      expect(stored.approval?.versionId).toBe(article.approval?.versionId)
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
