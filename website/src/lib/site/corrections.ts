import type { Payload } from 'payload'

import type { Article } from '../../payload-types'
import { formatDate, text } from './format'
import { articlePath } from './paths'
import { UNTITLED, type PublicCorrection, type SiteCorrection } from './types'

/** A correction's own fields, as stored on an article. */
type CorrectionRow = NonNullable<Article['corrections']>[number]

interface RawPublicCorrection extends PublicCorrection {
  /** The correction's raw date (ISO), kept for sorting across articles. */
  at: string
}

/**
 * Corrections marked to show a public note, with the raw date kept alongside the formatted one.
 * A draft's half-filled ones (no date, or no finished change) are skipped.
 */
function rawPublicCorrections(items: CorrectionRow[] | null | undefined): RawPublicCorrection[] {
  return (items ?? [])
    .filter((item) => item.showPublicNote === true)
    .flatMap((item) => {
      const date = formatDate(item.date)
      const change = text(item.change)
      return item.date && date && change ? [{ at: item.date, date, change }] : []
    })
}

/** Corrections marked to show a public note, newest first, for a single article's own page. */
export function publicCorrections(items: CorrectionRow[] | null | undefined): PublicCorrection[] {
  return rawPublicCorrections(items)
    .sort((a, b) => b.at.localeCompare(a.at))
    .map(({ date, change }) => ({ date, change }))
}

/**
 * Every public correction, newest first; when two share a date, the newer article's comes first
 * (stage 3 design, 6.3).
 */
export function sortCorrections(corrections: readonly SiteCorrection[]): SiteCorrection[] {
  return [...corrections].sort((a, b) => {
    const byDate = b.at.localeCompare(a.at)
    if (byDate !== 0) return byDate
    return (b.article.publishedAt ?? '').localeCompare(a.article.publishedAt ?? '')
  })
}

/** Row shape this module reads: just enough to flatten each article's public corrections. */
type CorrectionsArticleRow = Pick<Article, 'title' | 'slug' | 'publishedAt' | 'corrections'>

/**
 * Every correction marked to show a public note, across published articles, newest first
 * (stage 3 design, 6.3). Anonymous, like the rest of the public data layer (4.2).
 */
export async function findPublicCorrections(payload: Payload): Promise<SiteCorrection[]> {
  const { docs } = await payload.find({
    collection: 'articles',
    overrideAccess: false,
    depth: 0,
    where: { 'corrections.showPublicNote': { equals: true } },
    pagination: false,
    select: { title: true, slug: true, publishedAt: true, corrections: true },
  })
  const flattened = (docs as CorrectionsArticleRow[]).flatMap((row): SiteCorrection[] => {
    if (!row.slug) return []
    const title = text(row.title) ?? UNTITLED
    const article = { title, path: articlePath(row.slug), publishedAt: row.publishedAt ?? null }
    return rawPublicCorrections(row.corrections).map((correction) => ({ ...correction, article }))
  })
  return sortCorrections(flattened)
}
