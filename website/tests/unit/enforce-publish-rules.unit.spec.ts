import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { enforcePublishRules } from '@/collections/articles/publish-rules'
import { RESTORING_AS_DRAFT } from '@/collections/shared/publishing'

const findByID = vi.fn()
const requestWith = (context: Record<string, unknown> = {}): PayloadRequest =>
  ({ payload: { findByID }, context }) as unknown as PayloadRequest

const run = (data: Record<string, unknown>, req: PayloadRequest) =>
  enforcePublishRules({
    collection: { slug: 'articles' },
    data,
    req,
  } as unknown as Parameters<CollectionBeforeChangeHook>[0])

const ready = { _status: 'published', shape: 'vani-note' }

describe('enforcePublishRules', () => {
  it('reads a difficulty given as a populated object by its id', async () => {
    findByID.mockResolvedValue({ id: 3, needsPriorReading: false })
    const data = { ...ready, difficulty: { id: 3, name: 'Beginner' } }
    await expect(run(data, requestWith())).resolves.toEqual(data)
    expect(findByID).toHaveBeenCalledWith(expect.objectContaining({ id: 3 }))
  })

  it('refuses a difficulty object with no usable id', async () => {
    await expect(run({ ...ready, difficulty: { name: 'x' } }, requestWith())).rejects.toThrow()
  })

  it('does not check a version restored as a draft', async () => {
    const data = { _status: 'published', shape: 'vani-note' }
    await expect(run(data, requestWith({ [RESTORING_AS_DRAFT]: true }))).resolves.toEqual(data)
  })
})
