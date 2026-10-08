import { APIError, type CollectionBeforeOperationHook } from 'payload'

import { isOwner } from '../../access/roles'

export const DRAFTS_ONLY_MESSAGE = 'The assistant saves drafts only; the owner publishes.'

// Operations that only read. Everything else an assistant asks for is a write and must be a draft.
const READ_OPERATIONS = new Set(['count', 'countVersions', 'read', 'readDistinct'])

// The operation arguments this guard reads. Payload's REST endpoints parse `?draft=true` into
// `draft: true`. Collection hooks after this one never see the flag, which is why the check is here.
type WriteArgs = {
  data?: { _status?: unknown }
  draft?: unknown
  duplicateFromID?: unknown
  id?: unknown
}

const refuse = (): never => {
  throw new APIError(DRAFTS_ONLY_MESSAGE, 403, undefined, true)
}

/**
 * Keeps every signed-in account except the owner to draft saves (stage 2 design, 4.2). A draft
 * save of a published article only adds a version, so the live article is untouched. Refuses
 * publishing, non-draft updates (which would unpublish), duplicating, bulk updates, deletes and
 * version restores. Requests with no user are left to access control.
 */
export const draftsOnlyForAssistant: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (!req.user || isOwner(req.user) || READ_OPERATIONS.has(operation)) return args
  if (operation !== 'create' && operation !== 'update') return refuse()

  const write = args as WriteArgs
  if (write.draft !== true || write.data?._status === 'published') return refuse()
  if (operation === 'create' && write.duplicateFromID !== undefined) return refuse()
  if (operation === 'update' && write.id === undefined) return refuse()
  return args
}
