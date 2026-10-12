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

/** Request-context key: whether this create, update or restore saves a draft. */
export const DRAFT_SAVE = 'draftSave'

/**
 * Records Payload's `draft` flag, which only beforeOperation hooks receive. An unpublish and a
 * draft save look the same to afterChange, so hooks that act only when the live document changes
 * read isDraftSave instead (stage 3a plan, before you start).
 */
export const markDraftSave: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation === 'create' || operation === 'update' || operation === 'restoreVersion') {
    req.context[DRAFT_SAVE] = (args as { draft?: unknown }).draft === true
  }
  return args
}

/** Whether this request's save is a draft save: the live document doesn't change. */
export const isDraftSave = (req: PayloadRequest): boolean => req.context?.[DRAFT_SAVE] === true
