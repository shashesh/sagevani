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
