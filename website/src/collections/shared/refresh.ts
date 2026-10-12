import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
} from 'payload'

import { refreshSite } from '../../lib/site/refresh'
import { isDraftSave } from './publishing'

/**
 * Articles and pages: every save but a draft save changes the live document. That covers a
 * publish, an unpublish and a version restored without the draft flag. A draft save, an autosave
 * included, never does. Needs markDraftSave among the collection's beforeOperation hooks.
 */
export const refreshUnlessDraft: CollectionAfterChangeHook = ({ doc, req }) => {
  if (!isDraftSave(req)) refreshSite(req.payload.logger)
  return doc
}

/**
 * Articles and pages: deleting a published document takes it off the site. A delete with a
 * `select` can leave out the status, so refresh unless the document is known to be a draft.
 */
export const refreshUnlessDraftDeleted: CollectionAfterDeleteHook = ({ doc, req }) => {
  if ((doc as { _status?: unknown } | undefined)?._status !== 'draft') {
    refreshSite(req.payload.logger)
  }
  return doc
}

/** Topics and difficulty levels: every change can show on a public page. */
export const refreshAfterChange: CollectionAfterChangeHook = ({ doc, req }) => {
  refreshSite(req.payload.logger)
  return doc
}

export const refreshAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  refreshSite(req.payload.logger)
  return doc
}

/** Media: an upload alone changes no public page; editing an image's details can. */
export const refreshAfterMediaEdit: CollectionAfterChangeHook = ({ doc, operation, req }) => {
  if (operation === 'update') refreshSite(req.payload.logger)
  return doc
}

/** Site settings: every change can show on a public page. */
export const refreshAfterGlobalChange: GlobalAfterChangeHook = ({ doc, req }) => {
  refreshSite(req.payload.logger)
  return doc
}
