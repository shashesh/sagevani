import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionSlug,
  type PayloadRequest,
} from 'payload'

import { isOwner } from '../../access/roles'

export const OWNER_PUBLISHES_MESSAGE = 'Only the owner publishes.'

type Approval = {
  approvedAt?: string | null
  approvedBy?: number | string | { id: number | string } | null
  versionId?: string | null
}

type LiveRow = {
  _status?: 'draft' | 'published' | null
  approval?: Approval | null
  id: number | string
  publishedAt?: string | null
}

const idOf = (value: Approval['approvedBy']): number | string | null =>
  value !== null && typeof value === 'object' ? value.id : (value ?? null)

/** The stored row, straight from the database: the only source of truth for the approval. */
async function readLiveRow(
  req: PayloadRequest,
  collection: CollectionSlug,
  id: number | string,
): Promise<LiveRow | null> {
  const row = await req.payload.db.findOne<LiveRow>({
    collection,
    where: { id: { equals: id } },
    req,
  })
  return row ?? null
}

/**
 * Publishing is the owner's approval (website design, 8.3). Only the owner publishes. A save
 * that publishes records who approved it and when, and sets publishedAt the first time. Every
 * other save keeps both exactly as stored: they come from the live row, never from the request
 * or from a version snapshot, so nothing sent to the API can forge them. The version id is not
 * known until Payload saves the version, so it starts empty and recordApprovedVersion fills it in.
 */
export const recordApproval: CollectionBeforeChangeHook = async ({
  collection,
  data,
  originalDoc,
  req,
}) => {
  const live = originalDoc?.id ? await readLiveRow(req, collection.slug, originalDoc.id) : null

  if (data._status !== 'published') {
    return {
      ...data,
      publishedAt: live?.publishedAt ?? null,
      // An empty group, not null: Payload reads the group's fields, so null would crash it.
      approval: {
        approvedBy: idOf(live?.approval?.approvedBy),
        approvedAt: live?.approval?.approvedAt ?? null,
        versionId: live?.approval?.versionId ?? null,
      },
    }
  }

  if (!req.user || !isOwner(req.user)) {
    throw new APIError(OWNER_PUBLISHES_MESSAGE, 403, undefined, true)
  }
  const now = new Date().toISOString()
  return {
    ...data,
    publishedAt: live?.publishedAt ?? now,
    approval: { approvedBy: req.user.id, approvedAt: now, versionId: null },
  }
}

/**
 * Runs after Payload has saved the version. It reads the live row, not the document it is
 * handed (which a `select` can trim), and finds the version this publish made by its published
 * status and its approval time. It never guesses by creation order. If that version is not
 * found it throws, which rolls the whole save back: a wrong or empty id is never recorded. The id
 * is written to the live row only, through the database adapter, so no extra version is created
 * and no hooks run again.
 */
export const recordApprovedVersion: CollectionAfterChangeHook = async ({
  collection,
  doc,
  req,
}) => {
  const live = await readLiveRow(req, collection.slug, doc.id)
  const approvedAt = live?.approval?.approvedAt
  if (!live || live._status !== 'published' || !approvedAt || live.approval?.versionId) return doc

  const { docs } = await req.payload.db.findVersions({
    collection: collection.slug,
    where: {
      and: [
        { parent: { equals: live.id } },
        { 'version._status': { equals: 'published' } },
        { 'version.approval.approvedAt': { equals: approvedAt } },
      ],
    },
    sort: '-id',
    limit: 1,
    pagination: false,
    req,
  })
  if (!docs[0]) throw new APIError('The published version could not be identified.', 500)

  const versionId = String(docs[0].id)
  const approval = { ...live.approval, approvedBy: idOf(live.approval?.approvedBy), versionId }
  await req.payload.db.updateOne({
    collection: collection.slug,
    id: live.id,
    data: { approval },
    req,
  })
  return doc.approval ? { ...doc, approval: { ...doc.approval, versionId } } : doc
}
