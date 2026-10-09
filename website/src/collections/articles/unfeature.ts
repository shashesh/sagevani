import type { CollectionAfterChangeHook, PayloadRequest } from 'payload'

const FEATURED_FIELDS = ['featuredPicks', 'startHere'] as const
const QUEUE = 'unfeatureQueue'

const idOf = (value: unknown): string =>
  String(typeof value === 'object' && value !== null ? (value as { id?: unknown }).id : value)

async function removeFromSettings(req: PayloadRequest, id: string): Promise<void> {
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

  if (Object.keys(data).length === 0) return

  // The adapter empties an array that a partial write leaves out, so the navigation travels
  // along unchanged.
  await req.payload.db.updateGlobal({
    slug: 'siteSettings',
    data: { navigation: settings.navigation ?? [], ...data },
    req,
  })
}

/**
 * A featured article that stops being published would make every later save of the site
 * settings fail, because Payload re-checks the published-only filter on save. So once the live
 * row is not published, the article is taken out of the featured article, the featured picks and
 * the start-here list. Only the fields that held it are written, through the database adapter,
 * which skips field validation on purpose: removing an entry can never make the settings
 * invalid, while re-validating the other entries fails when several featured articles are
 * unpublished in one bulk update, because they are all mid-unpublish.
 *
 * A bulk update runs this hook for every article at once, on one request. Each run reads the
 * settings and writes them back, so the runs are queued on the request: otherwise they all read
 * the same starting settings and the last write undoes the others.
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

  const previous = (req.context[QUEUE] as Promise<void> | undefined) ?? Promise.resolve()
  const run = previous.then(() => removeFromSettings(req, String(doc.id)))
  // A failed run must not stop the runs queued behind it; its own error still reaches this save.
  req.context[QUEUE] = run.catch(() => undefined)
  await run
  return doc
}
