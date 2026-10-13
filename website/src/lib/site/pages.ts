import type { Payload } from 'payload'

import { idOf, isDatabaseId } from '../ids'
import type { Page } from '../../payload-types'
import { publishedCardsInOrder } from './articles'
import { bodyReferences, linkTargets } from './body'
import { publicImages, publishedArticles, publishedPageSlugs } from './lookups'
import { START_HERE_SLUG } from './paths'
import { UNTITLED, type PageView, type StartHereView } from './types'

export const PAGE_SELECT = { title: true, slug: true, body: true } as const

/** A page as PAGE_SELECT reads it; optional fields because a preview reads drafts. */
export type PageRow = Pick<Page, 'id'> & Partial<Pick<Page, keyof typeof PAGE_SELECT>>

/** A page's title and body, with its images and published link targets. */
export async function toPageView(payload: Payload, row: PageRow): Promise<PageView> {
  const refs = bodyReferences(row.body)
  const [images, articles, pages] = await Promise.all([
    publicImages(payload, refs.images),
    publishedArticles(payload, refs.articles),
    publishedPageSlugs(payload, refs.pages),
  ])
  return {
    id: row.id,
    slug: row.slug ?? '',
    title: row.title?.trim() || UNTITLED,
    body: row.body ?? null,
    bodyContext: { images, links: linkTargets(articles, pages) },
  }
}

/** The published page with this slug, or null (stage 3 design, 6.3). */
export async function findPublishedPage(payload: Payload, slug: string): Promise<PageView | null> {
  const { docs } = await payload.find({
    collection: 'pages',
    overrideAccess: false,
    depth: 0,
    where: { slug: { equals: slug } },
    pagination: false,
    limit: 1,
    select: PAGE_SELECT,
  })
  return docs[0] ? toPageView(payload, docs[0]) : null
}

/**
 * The Start-here page's body, then its list of articles as cards, in reading order (stage 3
 * design, 6.3). Either part alone is enough to show something; the caller 404s only when both
 * are absent (a page is null and the list is empty).
 */
export async function findStartHere(payload: Payload): Promise<StartHereView> {
  const [page, settings] = await Promise.all([
    findPublishedPage(payload, START_HERE_SLUG),
    payload.findGlobal({
      slug: 'siteSettings',
      overrideAccess: false,
      depth: 0,
      select: { startHere: true },
    }),
  ])
  // depth 0 should give bare ids already; idOf also handles a populated value, the same rule as
  // the rest of this module (uniqueIds in body.ts), but keeps the given order instead of deduping.
  const ids = (settings.startHere ?? []).flatMap((entry) => {
    const id = idOf(entry)
    return isDatabaseId(id) ? [Number(id)] : []
  })
  const articles = await publishedCardsInOrder(payload, ids)
  return { page, articles }
}
