import {
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeValidateHook,
  type CollectionSlug,
  type TextField,
} from 'payload'

import { slugify } from '../../lib/slug'

export const SLUG_REQUIRED_MESSAGE =
  'Add a slug: the title has no letters a URL can use, such as Latin letters or digits.'

/** The slug field. Not `required`: the admin would demand it before the server can derive it. */
export const slugField = (description: string): TextField => ({
  name: 'slug',
  type: 'text',
  unique: true,
  index: true,
  admin: { position: 'sidebar', description },
})

/**
 * Makes the slug plain ASCII. A typed slug is cleaned; an empty one is made from `sourceField`
 * (`Māyā and the Rope` → `maya-and-the-rope`).
 */
export const deriveSlug =
  (sourceField: string): CollectionBeforeValidateHook =>
  ({ data }) => {
    if (!data) return data
    const typed = typeof data.slug === 'string' && data.slug.trim() !== '' ? data.slug : undefined
    const source: unknown = typed ?? data[sourceField]
    if (typeof source !== 'string') return data
    return { ...data, slug: slugify(source) || null }
  }

/**
 * A slug must be unique, and present whenever the document goes live: on publish for a
 * collection with drafts, on every save otherwise. The clash error names the slug.
 */
export const checkSlug: CollectionBeforeChangeHook = async ({
  collection,
  data,
  originalDoc,
  req,
}) => {
  const hasDrafts = Boolean(collection.versions && collection.versions.drafts)
  const goingLive = !hasDrafts || data._status === 'published'
  const slug: unknown = data.slug

  if (typeof slug !== 'string' || slug === '') {
    if (!goingLive) return data
    throw new ValidationError({
      collection: collection.slug,
      errors: [{ path: 'slug', message: SLUG_REQUIRED_MESSAGE }],
    })
  }

  const { totalDocs } = await req.payload.count({
    collection: collection.slug as CollectionSlug,
    where: {
      and: [
        { slug: { equals: slug } },
        ...(originalDoc?.id === undefined ? [] : [{ id: { not_equals: originalDoc.id } }]),
      ],
    },
    overrideAccess: true,
    req,
  })
  if (totalDocs > 0) {
    throw new ValidationError({
      collection: collection.slug,
      errors: [{ path: 'slug', message: `The slug "${slug}" is already used. Choose another.` }],
    })
  }
  return data
}
