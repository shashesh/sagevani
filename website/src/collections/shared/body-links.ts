import { ValidationError, type CollectionBeforeChangeHook } from 'payload'

import { findLinkedDocuments, type LinkedDocument } from '../../lib/rich-text'

export const BODY_LINKS_MESSAGE = 'The body can link to articles and show images from media only.'

const UPLOAD_COLLECTION = 'media'

const isId = (value: unknown): boolean => typeof value === 'number' || typeof value === 'string'

const isAllowed = (
  { kind, relationTo, value }: LinkedDocument,
  linkTo: readonly string[],
): boolean => {
  // The admin saves at depth 0, so it always sends ids. An object is a forged populated document.
  if (typeof relationTo !== 'string' || !isId(value)) return false
  if (kind === 'link') return linkTo.includes(relationTo)
  if (kind === 'upload') return relationTo === UPLOAD_COLLECTION
  return false
}

/**
 * A beforeChange hook: on every save, drafts included, refuses any target outside the allowed
 * list (a link to a collection in `linkTo`, an upload from media, each by a plain string
 * `relationTo`) and any value that isn't an id. Embedded relationships are refused. Node shapes
 * that point nowhere are stored as sent and populate nothing in Payload 3.90.2; re-check this
 * when Payload is upgraded. The editor's settings only shape its menus, so this does the checking.
 */
export const bodyLinksOnlyTo =
  (linkTo: readonly string[]): CollectionBeforeChangeHook =>
  ({ collection, data }) => {
    const linked = findLinkedDocuments((data as { body?: unknown } | undefined)?.body)
    if (!linked.every((document) => isAllowed(document, linkTo))) {
      throw new ValidationError({
        collection: collection.slug,
        errors: [{ path: 'body', message: BODY_LINKS_MESSAGE }],
      })
    }
    return data
  }
