import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { publishProblems, type PublishCheckInput } from '../../lib/publish-rules'
import { findUploadIds } from '../../lib/rich-text'

const idOf = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const { id } = value as { id: unknown }
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

async function difficultyOf(
  value: unknown,
  req: PayloadRequest,
): Promise<PublishCheckInput['difficulty']> {
  const id = idOf(value)
  if (id === null) return null
  const level = await req.payload.findByID({
    collection: 'difficultyLevels',
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req,
  })
  return level ? { needsPriorReading: level.needsPriorReading === true } : null
}

async function imagesOf(body: unknown, req: PayloadRequest): Promise<PublishCheckInput['images']> {
  const ids = findUploadIds(body)
  if (ids.length === 0) return []
  const { docs } = await req.payload.find({
    collection: 'media',
    where: { id: { in: ids } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const altById = new Map(docs.map((doc) => [String(doc.id), doc.alt]))
  return ids.map((id) => ({ id, alt: altById.get(String(id)) }))
}

/** Runs the publish rules whenever an article is published; drafts may be incomplete. */
export const enforcePublishRules: CollectionBeforeChangeHook = async ({
  collection,
  data,
  req,
}) => {
  if (data._status !== 'published') return data
  const problems = publishProblems({
    shape: data.shape,
    difficulty: await difficultyOf(data.difficulty, req),
    readFirst: Array.isArray(data.readFirst) ? data.readFirst : [],
    sourceCount: Array.isArray(data.sources) ? data.sources.length : 0,
    images: await imagesOf(data.body, req),
  })
  if (problems.length > 0)
    throw new ValidationError({ collection: collection.slug, errors: problems })
  return data
}
