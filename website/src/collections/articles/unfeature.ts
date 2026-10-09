import type { CollectionAfterChangeHook } from 'payload'

const FEATURED_FIELDS = ['featuredPicks', 'startHere'] as const

const idOf = (value: unknown): string =>
  String(typeof value === 'object' && value !== null ? (value as { id?: unknown }).id : value)

/**
 * A featured article that stops being published would make every later save of the site
 * settings fail, because Payload re-checks the published-only filter on save. So once the live
 * row is not published, the article is taken out of the featured article, the featured picks and
 * the start-here list. Only the fields that held it are written.
 */
export const unfeatureWhenUnpublished: CollectionAfterChangeHook = async ({
  collection,
  doc,
  req,
}) => {
  const live = await req.payload.db.findOne<{ id: number | string; _status?: string | null }>({
    collection: collection.slug,
    where: { id: { equals: doc.id } },
    req,
  })
  if (!live || live._status === 'published') return doc

  const id = String(doc.id)
  const settings = await req.payload.findGlobal({
    slug: 'siteSettings',
    depth: 0,
    overrideAccess: true,
    req,
  })

  const data: {
    featuredArticle?: null
    featuredPicks?: number[]
    startHere?: number[]
  } = {}
  if (settings.featuredArticle != null && idOf(settings.featuredArticle) === id) {
    data.featuredArticle = null
  }
  for (const field of FEATURED_FIELDS) {
    const entries = (settings[field] ?? []) as (number | { id: number })[]
    const kept = entries.filter((entry) => idOf(entry) !== id)
    if (kept.length !== entries.length) {
      data[field] = kept.map((entry) => (typeof entry === 'object' ? entry.id : entry))
    }
  }

  if (Object.keys(data).length > 0) {
    await req.payload.updateGlobal({ slug: 'siteSettings', data, overrideAccess: true, req })
  }
  return doc
}
