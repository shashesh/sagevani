import { ValidationError, type CollectionBeforeChangeHook } from 'payload'

import { findLinkedDocuments, type LinkedDocument } from '../../lib/rich-text'

export const BODY_LINKS_MESSAGE = 'The body can link to articles and show images from media only.'

const UPLOAD_COLLECTION = 'media'

const isAllowed = ({ kind, relationTo }: LinkedDocument, linkTo: readonly string[]): boolean => {
  if (typeof relationTo !== 'string') return false
  if (kind === 'link') return linkTo.includes(relationTo)
  if (kind === 'upload') return relationTo === UPLOAD_COLLECTION
  return false
}

/**
 * A beforeChange hook: on every save, drafts included, refuses anything the body points at except
 * a link to a collection in `linkTo` and an upload from media, each by a plain string
 * `relationTo`. It fails closed: any other shape (an array, a missing value, an embedded
 * relationship) is refused. The editor's settings only shape its menus; Payload doesn't check
 * the saved content, so this does.
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
