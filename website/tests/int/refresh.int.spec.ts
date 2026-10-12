import { revalidateTag } from 'next/cache'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { DifficultyLevel, User } from '@/payload-types'

import { ASSISTANT_KEY, PASSWORD, clearContent, createStaff, rest } from '../helpers/content'

vi.mock('next/cache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag: vi.fn(),
}))

let payload: Payload
let owner: User
let level: DifficultyLevel

/** Runs an action as if inside Next and returns how many times it refreshed the site. */
async function refreshesDuring(action: () => Promise<unknown>): Promise<number> {
  vi.mocked(revalidateTag).mockClear()
  vi.stubEnv('NEXT_RUNTIME', 'nodejs')
  try {
    await action()
  } finally {
    vi.unstubAllEnvs()
  }
  return vi.mocked(revalidateTag).mock.calls.length
}

const publish = (title: string) =>
  payload.create({
    collection: 'articles',
    data: { title, shape: 'vani-note', difficulty: level.id, _status: 'published' },
    overrideAccess: false,
    user: owner,
  })

const ownerToken = async (): Promise<string> => {
  const { token } = await payload.login({
    collection: 'users',
    data: { email: owner.email, password: PASSWORD },
  })
  if (!token) throw new Error('The owner could not sign in.')
  return token
}

describe('refreshing the public pages', () => {
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
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  it('refreshes when an article is published', async () => {
    expect(await refreshesDuring(() => publish('Live'))).toBe(1)
    expect(revalidateTag).toHaveBeenCalledWith('site', { expire: 0 })
  })

  it('does not refresh for a draft, a draft over a published article, or an autosave', async () => {
    expect(
      await refreshesDuring(() =>
        payload.create({
          collection: 'articles',
          data: { title: 'A draft' },
          draft: true,
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(0)

    const live = await publish('Live')
    const draftEdit = {
      collection: 'articles',
      id: live.id,
      overrideAccess: false,
      user: owner,
    } as const
    expect(
      await refreshesDuring(() =>
        payload.update({ ...draftEdit, data: { title: 'Draft title' }, draft: true }),
      ),
    ).toBe(0)
    expect(
      await refreshesDuring(() =>
        payload.update({ ...draftEdit, data: { title: 'Autosaved' }, draft: true, autosave: true }),
      ),
    ).toBe(0)
  })

  it('does not refresh for the assistant’s draft through REST', async () => {
    let status = 0
    expect(
      await refreshesDuring(async () => {
        status = (
          await rest('POST', 'articles?draft=true', {
            key: ASSISTANT_KEY,
            body: { title: 'The assistant’s draft' },
          })
        ).status
      }),
    ).toBe(0)
    expect(status).toBe(201)
  })

  it('refreshes when an article is unpublished', async () => {
    const live = await publish('Live')
    expect(
      await refreshesDuring(() =>
        payload.update({
          collection: 'articles',
          id: live.id,
          data: { _status: 'draft' },
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(1)
  })

  it('refreshes when a published article is deleted, but not a draft', async () => {
    const live = await publish('Live')
    const draft = await payload.create({
      collection: 'articles',
      data: { title: 'A draft' },
      draft: true,
      overrideAccess: true,
    })
    const remove = (id: number) =>
      payload.delete({ collection: 'articles', id, overrideAccess: false, user: owner })
    expect(await refreshesDuring(() => remove(draft.id))).toBe(0)
    expect(await refreshesDuring(() => remove(live.id))).toBe(1)
  })

  it('refreshes when a version is restored and published, not when it is restored as a draft', async () => {
    const live = await publish('Live')
    await payload.update({
      collection: 'articles',
      id: live.id,
      data: { title: 'Second' },
      draft: true,
      overrideAccess: false,
      user: owner,
    })
    const { docs } = await payload.findVersions({
      collection: 'articles',
      where: { parent: { equals: live.id } },
      sort: 'createdAt',
      limit: 1,
      overrideAccess: true,
    })
    const token = await ownerToken()
    const restore = (query: string) =>
      refreshesDuring(async () => {
        const response = await rest('POST', `articles/versions/${docs[0].id}${query}`, { token })
        expect(response.status).toBe(200)
      })
    expect(await restore('?draft=true')).toBe(0)
    expect(await restore('')).toBe(1)
  })

  it('refreshes when a page is published, not when one is saved as a draft', async () => {
    expect(
      await refreshesDuring(() =>
        payload.create({
          collection: 'pages',
          data: { title: 'About', _status: 'published' },
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(1)
    expect(
      await refreshesDuring(() =>
        payload.create({
          collection: 'pages',
          data: { title: 'A draft page' },
          draft: true,
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(0)
  })

  it('refreshes on every change to topics, levels and site settings', async () => {
    expect(
      await refreshesDuring(() =>
        payload.create({
          collection: 'topics',
          data: {
            name: 'A test topic',
            question: 'A test question?',
            order: 9,
            coverTint: { background: '#e3cfa8', text: '#3d2f1c' },
          },
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(1)
    expect(
      await refreshesDuring(() =>
        payload.update({
          collection: 'difficultyLevels',
          id: level.id,
          data: { description: 'Changed for the test' },
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(1)
    expect(
      await refreshesDuring(() =>
        payload.updateGlobal({
          slug: 'siteSettings',
          data: { footerMotto: 'A test motto' },
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(1)
  })

  it('does not refresh for an upload alone, but does when an image is edited or deleted', async () => {
    const data = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#9a3b26' },
    })
      .png()
      .toBuffer()
    let id = 0
    expect(
      await refreshesDuring(async () => {
        const media = await payload.create({
          collection: 'media',
          data: {
            alt: 'A square',
            creator: 'Sagevani',
            source: 'Made for this test',
            licence: 'Own work',
          },
          file: { data, mimetype: 'image/png', name: 'square.png', size: data.length },
          overrideAccess: false,
          user: owner,
        })
        id = media.id
      }),
    ).toBe(0)
    expect(
      await refreshesDuring(() =>
        payload.update({
          collection: 'media',
          id,
          data: { alt: 'A red square' },
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(1)
    expect(
      await refreshesDuring(() =>
        payload.delete({ collection: 'media', id, overrideAccess: false, user: owner }),
      ),
    ).toBe(1)
  })

  it('never refreshes outside Next, even for a publish', async () => {
    vi.mocked(revalidateTag).mockClear()
    await publish('Live')
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})
