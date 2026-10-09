import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeOperationHook,
  type CollectionSlug,
  type PayloadRequest,
} from 'payload'

import { isOwner } from '../../access/roles'
import { idOf } from '../../lib/ids'
import { isPublishing, RESTORING_AS_DRAFT } from '../shared/publishing'

export const OWNER_PUBLISHES_MESSAGE = 'Only the owner publishes.'

type Approval = {
  approvedAt?: string | null
  approvedBy?: number | string | { id: number | string } | null
  versionId?: string | null
}

type LiveRow = {
  _status?: 'draft' | 'published' | null
  approval?: Approval | null
  emailRecipients?: number | null
  emailSentAt?: string | null
  id: number | string
  publishedAt?: string | null
}

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
 * Only the owner publishes. Runs first among the article's beforeChange hooks, so a publish
 * from anyone else gets this refusal, not a list of rule problems.
 */
export const onlyOwnerPublishes: CollectionBeforeChangeHook = ({ data, req }) => {
  if (isPublishing(data, req) && (!req.user || !isOwner(req.user))) {
    throw new APIError(OWNER_PUBLISHES_MESSAGE, 403, undefined, true)
  }
  return data
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
  // Stage 4 writes the email record on the live row. Like the approval, it is never taken from
  // the request or from a version snapshot.
  const emailRecord = {
    emailSentAt: live?.emailSentAt ?? null,
    emailRecipients: live?.emailRecipients ?? null,
  }

  if (!isPublishing(data, req)) {
    return {
      ...data,
      ...emailRecord,
      publishedAt: live?.publishedAt ?? null,
      // An empty group, not null: Payload reads the group's fields, so null would crash it.
      approval: {
        approvedBy: idOf(live?.approval?.approvedBy),
        approvedAt: live?.approval?.approvedAt ?? null,
        versionId: live?.approval?.versionId ?? null,
      },
    }
  }

  // onlyOwnerPublishes has already run, first, so only the owner reaches here.
  const now = new Date().toISOString()
  return {
    ...data,
    ...emailRecord,
    publishedAt: live?.publishedAt ?? now,
    approval: { approvedBy: req.user?.id, approvedAt: now, versionId: null },
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

export const BULK_PUBLISH_MESSAGE = 'Publish articles one at a time, from each article’s page.'

/**
 * Publishing is one article at a time (stage 2 design, 4.3), for everyone, the owner included:
 * the approval names one version, so each article is published from its own page. A bulk update
 * has no id. It is refused when it publishes, and also when it is neither a draft save nor an
 * unpublish, because the status then defaults from each stored row and republishes it. Bulk
 * unpublishing and bulk draft edits stay allowed.
 */
export const refuseBulkPublish: CollectionBeforeOperationHook = ({ args, operation }) => {
  const write = args as { data?: { _status?: unknown }; draft?: unknown; id?: unknown }
  if (operation !== 'update' || write.id !== undefined) return args
  const status = write.data?._status
  if (status === 'published' || (write.draft !== true && status !== 'draft')) {
    throw new APIError(BULK_PUBLISH_MESSAGE, 403, undefined, true)
  }
  return args
}

export const AUTOSAVE_MESSAGE = 'Autosave saves drafts only.'

/**
 * An autosave without the draft flag would make Payload rewrite the latest autosave version in
 * place as the published one, and the next ordinary autosave would rewrite it again, so the
 * approval would name a version whose text is no longer what was published. Autosave never
 * publishes, for everyone.
 */
export const autosaveOnlyForDrafts: CollectionBeforeOperationHook = ({ args, operation }) => {
  if (operation !== 'create' && operation !== 'update') return args
  const write = args as { autosave?: unknown; data?: { _status?: unknown }; draft?: unknown }
  const autosaving =
    write.autosave !== undefined && write.autosave !== null && write.autosave !== false
  // `draft=true` alone is not enough: with `_status: 'published'` in the body Payload still
  // publishes, and rewrites the latest autosave version in place.
  if (autosaving && (write.draft !== true || write.data?._status === 'published')) {
    throw new APIError(AUTOSAVE_MESSAGE, 403, undefined, true)
  }
  return args
}

/**
 * Restoring a version with `draft: true` is a draft save, though the old version's status is
 * still 'published'. Marks the request so the publishing hooks treat it as one.
 */
export const markRestoreAsDraft: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== 'restoreVersion') return args
  req.context[RESTORING_AS_DRAFT] = (args as { draft?: unknown }).draft === true
  return args
}
