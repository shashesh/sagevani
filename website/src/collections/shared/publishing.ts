import type { PayloadRequest } from 'payload'

/**
 * Request-context key set while a version is restored as a draft. Payload passes the old
 * version's `_status: 'published'` to the collection hooks even then, but the result is a draft
 * save: nothing goes live, so no approval, publish rule or live-slug check applies.
 */
export const RESTORING_AS_DRAFT = 'restoringAsDraft'

/** Whether this save puts the document live. */
export const isPublishing = (data: { _status?: unknown }, req: PayloadRequest): boolean =>
  data._status === 'published' && req.context?.[RESTORING_AS_DRAFT] !== true
