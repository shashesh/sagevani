import { createLocalReq, getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'
import config from '@/payload.config'

import { clearContent } from '../helpers/content'

let payload: Payload

const startingData = () => {
  const migration = migrations.find(({ name }) => name.endsWith('_starting_data'))
  if (!migration) throw new Error('No *_starting_data migration in src/migrations/index.ts')
  return migration
}

const runUp = async () => {
  const req = await createLocalReq({}, payload)
  await startingData().up({ db: payload.db.drizzle, payload, req } as never)
}

describe('starting data migration', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearContent(payload)
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  it('adds the four doors with the charter’s questions, in order', async () => {
    await runUp()
    const { docs } = await payload.find({
      collection: 'topics',
      sort: 'order',
      overrideAccess: true,
    })
    expect(
      docs.map(({ name, slug, question, order }) => ({ name, slug, question, order })),
    ).toEqual([
      { name: 'Dharma', slug: 'dharma', question: 'How shall I live?', order: 1 },
      { name: 'Adhyātma', slug: 'adhyatma', question: 'Who am I?', order: 2 },
      {
        name: 'Bhakti',
        slug: 'bhakti',
        question: 'What is the Divine, and what is my relationship to it?',
        order: 3,
      },
      {
        name: 'Sādhanā',
        slug: 'sadhana',
        question: 'How shall I practice what I understand?',
        order: 4,
      },
    ])
    expect(docs.map((topic) => topic.coverTint)).toEqual([
      { background: '#e3cfa8', text: '#3d2f1c' },
      { background: '#cfcbc5', text: '#2b2a2c' },
      { background: '#e5c3b4', text: '#4a241a' },
      { background: '#cdd6c2', text: '#28331f' },
    ])
    expect(docs.every((topic) => !topic.intro)).toBe(true)
  })

  it('adds the three proposed levels, with Advanced needing prior reading', async () => {
    await runUp()
    const { docs } = await payload.find({
      collection: 'difficultyLevels',
      sort: 'order',
      overrideAccess: true,
    })
    expect(
      docs.map(({ name, description, needsPriorReading }) => ({
        name,
        description,
        needsPriorReading,
      })),
    ).toEqual([
      { name: 'Beginner', description: 'No prior study assumed', needsPriorReading: false },
      {
        name: 'Intermediate',
        description: 'Some familiarity with the relevant terms or text',
        needsPriorReading: false,
      },
      {
        name: 'Advanced',
        description: 'Familiarity with the texts, schools, or interpretive debates involved',
        needsPriorReading: true,
      },
    ])
  })

  it('can run again without duplicating rows or undoing the owner’s edits', async () => {
    await runUp()
    const dharma = (
      await payload.find({
        collection: 'topics',
        where: { slug: { equals: 'dharma' } },
        overrideAccess: true,
      })
    ).docs[0]
    await payload.update({
      collection: 'topics',
      id: dharma.id,
      data: { intro: 'Owner’s words.' },
      overrideAccess: true,
    })

    await runUp()
    expect((await payload.count({ collection: 'topics', overrideAccess: true })).totalDocs).toBe(4)
    expect(
      (await payload.count({ collection: 'difficultyLevels', overrideAccess: true })).totalDocs,
    ).toBe(3)
    const again = await payload.findByID({
      collection: 'topics',
      id: dharma.id,
      overrideAccess: true,
    })
    expect(again.intro).toBe('Owner’s words.')
  })
})
