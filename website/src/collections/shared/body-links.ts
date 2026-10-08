import { ValidationError, type CollectionBeforeChangeHook } from 'payload'

import { findLinkedDocuments } from '../../lib/rich-text'

export const BODY_LINKS_MESSAGE = 'The body can link to articles and show images from media only.'

const UPLOAD_COLLECTION = 'media'

/**
 * A beforeChange hook: on every save, drafts included, refuses links outside `linkTo`, any
 * embedded relationship, and uploads outside media. The editor's settings only shape its menus;
 * Payload doesn't check the saved content, so this does.
 */
export const bodyLinksOnlyTo =
  (linkTo: readonly string[]): CollectionBeforeChangeHook =>
  ({ collection, data }) => {
    const breaksRules = findLinkedDocuments((data as { body?: unknown } | undefined)?.body).some(
      ({ kind, relationTo }) =>
        kind === 'relationship' ||
        (kind === 'link' && !linkTo.includes(relationTo)) ||
        (kind === 'upload' && relationTo !== UPLOAD_COLLECTION),
    )
    if (breaksRules) {
      throw new ValidationError({
        collection: collection.slug,
        errors: [{ path: 'body', message: BODY_LINKS_MESSAGE }],
      })
    }
    return data
  }
