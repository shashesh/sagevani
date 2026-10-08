import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { SLUG_REQUIRED_MESSAGE } from '@/collections/shared/slug'
import config from '@/payload.config'
import type { User } from '@/payload-types'

import {
  ASSISTANT_KEY,
  clearContent,
  createStaff,
  rest,
  validationMessages,
} from '../helpers/content'

let payload: Payload
let owner: User

const TINT = { background: '#e3cfa8', text: '#3d2f1c' }

const createTopic = (data: { name: string; slug?: string; order?: number }) =>
  payload.create({
    collection: 'topics',
    data: { question: 'How shall I live?', order: 1, coverTint: TINT, ...data },
    overrideAccess: false,
    user: owner,
  })

describe('topics and difficulty levels', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearContent(payload)
    ;({ owner } = await createStaff(payload))
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  it('makes a topic slug from its name, without diacritics', async () => {
    expect((await createTopic({ name: 'Sādhanā' })).slug).toBe('sadhana')
    expect((await createTopic({ name: 'Adhyātma', slug: 'The Self' })).slug).toBe('the-self')
  })

  it('refuses a slug that another topic has, naming it', async () => {
    await createTopic({ name: 'Dharma' })
    expect(await validationMessages(createTopic({ name: 'Dharma' }))).toEqual([
      'The slug "dharma" is already used. Choose another.',
    ])
  })

  it('refuses a topic whose name gives no slug, until one is typed', async () => {
    expect(await validationMessages(createTopic({ name: 'धर्म' }))).toEqual([SLUG_REQUIRED_MESSAGE])
    expect((await createTopic({ name: 'धर्म', slug: 'dharma' })).slug).toBe('dharma')
  })

  it('refuses a cover tint that is not a six-digit hex colour', async () => {
    await expect(
      payload.create({
        collection: 'topics',
        data: {
          name: 'Bhakti',
          question: 'q',
          order: 3,
          coverTint: { background: 'pink', text: '#4a241a' },
        },
        overrideAccess: false,
        user: owner,
      }),
    ).rejects.toThrow(/background/i)
  })

  it('shows topics and levels to the public, sorted by order', async () => {
    await createTopic({ name: 'Bhakti', order: 3 })
    await createTopic({ name: 'Dharma', order: 1 })
    await payload.create({
      collection: 'difficultyLevels',
      data: { name: 'Beginner', order: 1 },
      overrideAccess: false,
      user: owner,
    })
    const topics = await (await rest('GET', 'topics')).json()
    expect(topics.docs.map((topic: { name: string }) => topic.name)).toEqual(['Dharma', 'Bhakti'])
    const levels = await (await rest('GET', 'difficultyLevels')).json()
    expect(levels.docs.map((level: { name: string }) => level.name)).toEqual(['Beginner'])
  })

  it('lets only the owner change topics and levels', async () => {
    const topic = await createTopic({ name: 'Dharma' })
    const edit = await rest('PATCH', `topics/${topic.id}`, {
      key: ASSISTANT_KEY,
      body: { intro: 'x' },
    })
    expect(edit.status).toBe(403)
    const create = await rest('POST', 'difficultyLevels', {
      key: ASSISTANT_KEY,
      body: { name: 'Expert', order: 4 },
    })
    expect(create.status).toBe(403)
    expect((await rest('DELETE', `topics/${topic.id}`)).status).toBe(403)
  })

  it('keeps level names unique', async () => {
    const level = { name: 'Advanced', order: 3, needsPriorReading: true }
    await payload.create({ collection: 'difficultyLevels', data: level, overrideAccess: true })
    await expect(
      payload.create({ collection: 'difficultyLevels', data: level, overrideAccess: true }),
    ).rejects.toThrow()
  })
})
