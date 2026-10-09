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

const MAX_MEDIA_ID = 2_147_483_647

/** A media id as the database stores it: a whole number within int4, or its digits. Nothing else reaches a query. */
const isMediaId = (id: number | string): boolean =>
  typeof id === 'number'
    ? Number.isSafeInteger(id) && id > 0 && id <= MAX_MEDIA_ID
    : /^\d{1,10}$/.test(id) && Number(id) <= MAX_MEDIA_ID

async function imagesOf(body: unknown, req: PayloadRequest): Promise<PublishCheckInput['images']> {
  const ids = findUploadIds(body)
  if (ids.length === 0) return []
  const validIds = ids.filter(isMediaId)
  const { docs } =
    validIds.length === 0
      ? { docs: [] }
      : await req.payload.find({
          collection: 'media',
          where: { id: { in: validIds } },
          depth: 0,
          pagination: false,
          overrideAccess: true,
          req,
        })
  const altById = new Map(docs.map((doc) => [String(doc.id), doc.alt]))
  return ids.map((id) => ({
    id,
    alt: altById.get(String(id)),
    missing: !isMediaId(id) || !altById.has(String(id)),
  }))
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
