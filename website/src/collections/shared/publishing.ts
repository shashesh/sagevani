import type { CollectionBeforeOperationHook, PayloadRequest } from 'payload'

/**
 * Request-context key set while a version is restored as a draft. Payload passes the old
 * version's `_status: 'published'` to the collection hooks even then, but the result is a draft
 * save: nothing goes live, so no approval, publish rule or live-slug check applies.
 */
export const RESTORING_AS_DRAFT = 'restoringAsDraft'

/** Whether this save puts the document live. */
export const isPublishing = (data: { _status?: unknown }, req: PayloadRequest): boolean =>
  data._status === 'published' && req.context?.[RESTORING_AS_DRAFT] !== true

/**
 * Restoring a version with `draft: true` is a draft save, though the old version's status is
 * still 'published'. Marks the request so the publishing hooks treat it as one. Every collection
 * with drafts that can be restored needs this, or a restore can publish a version straight away.
 */
export const markRestoreAsDraft: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== 'restoreVersion') return args
  req.context[RESTORING_AS_DRAFT] = (args as { draft?: unknown }).draft === true
  return args
}

/**
 * Request-context key: whether this create, update or restore saves a draft. The flag is per
 * request and the last write wins, so a nested article or page create, update or restore inside
 * a save, through the same req, would overwrite it. None exists today.
 */
export const DRAFT_SAVE = 'draftSave'

/**
 * Records Payload's `draft` flag, which only beforeOperation hooks receive. An unpublish and a
 * draft save look the same to afterChange, so hooks that act only when the live document changes
 * read isDraftSave instead (stage 3a plan, before you start).
 *
 * Mirrors Payload's isSavingDraft: an update that sets `_status: 'published'` puts the document
 * live even with the draft flag (the admin's bulk Publish sends exactly that). A create with the
 * flag is always a draft, and a restore is decided by the flag alone.
 */
export const markDraftSave: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation === 'create' || operation === 'update' || operation === 'restoreVersion') {
    const write = args as { draft?: unknown; data?: { _status?: unknown } }
    req.context[DRAFT_SAVE] =
      write.draft === true && !(operation === 'update' && write.data?._status === 'published')
  }
  return args
}

/** Whether this request's save is a draft save: the live document doesn't change. */
export const isDraftSave = (req: PayloadRequest): boolean => req.context?.[DRAFT_SAVE] === true
