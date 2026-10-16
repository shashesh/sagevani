import type { Payload, Where } from 'payload'

import { ARTICLE_SHAPES } from '../../collections/articles/options'
import { ARTICLE_CARD_SELECT, toArticleCards } from './articles'
import { allLevels, allTopics } from './lookups'
import type { ArchivePage, ArticleCard, TopicRef } from './types'

export { levelSlug } from './lookups'

/** Published articles to a page of the archive (stage 3 design, 6.3). */
export const ARCHIVE_PAGE_SIZE = 12

/** A query parameter's value, or its first value when it was repeated. */
type QueryValue = string | string[] | undefined

/** The shape Next hands a page `searchParams` prop, and what a unit test can build by hand. */
export type ArchiveSearchParams = Record<string, QueryValue>

/** The archive's three filters, already folded to the slugs their links use. */
export interface ArchiveFilters {
  topicSlug: string | null
  shape: string | null
  levelSlug: string | null
}

/** The known filter values a query is checked against, so an unknown one is ignored. */
export interface ArchiveLookupSlugs {
  topics: readonly string[]
  levels: readonly string[]
}

export interface ParsedArchiveQuery extends ArchiveFilters {
  /**
   * The requested page: 1 when the `page` parameter is absent, or when it is present but
   * `needsRedirect` is set. Meaningless when `invalidPage` is set.
   */
  page: number
  /**
   * The address itself is not canonical: `?page=1` is a valid page but the canonical address for
   * page 1 carries no `page` parameter at all (stage 3 design, 6.3). The route should answer a
   * permanent (308) redirect to the canonical address built by `archiveHref`, which already omits
   * page 1. A straightforward normalize redirect, not a 200: a reader's bookmark or a shared link
   * for `?page=1` always lands on the one canonical address.
   */
  needsRedirect: boolean
  /**
   * The `page` parameter was present but is not a canonical positive integer string (`abc`, `0`,
   * `-1`, `01`, `1.5`, ...). The route must answer 404, never a redirect: unlike `?page=1`, there
   * is no single canonical page a malformed value could mean.
   */
  invalidPage: boolean
}

const CANONICAL_PAGE = /^[1-9]\d*$/

function firstValue(value: QueryValue): string | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/**
 * Parses the archive's query string into its filters and page (stage 3 design, 6.3). Pure: given
 * the same query and the same known slugs, it always answers the same way, so it needs no I/O to
 * test. An unknown or empty filter value is ignored, exactly like an absent one: the three states
 * a filter could otherwise take collapse to two, "set" and "not set".
 */
export function parseArchiveQuery(
  searchParams: ArchiveSearchParams,
  { topics, levels }: ArchiveLookupSlugs,
): ParsedArchiveQuery {
  const topicSlug = firstValue(searchParams.topic)
  const shape = firstValue(searchParams.shape)
  const levelSlugValue = firstValue(searchParams.difficulty)
  const pageParam = firstValue(searchParams.page)

  let page = 1
  let needsRedirect = false
  let invalidPage = false
  if (pageParam !== null) {
    if (CANONICAL_PAGE.test(pageParam)) {
      const value = Number(pageParam)
      if (value === 1) {
        needsRedirect = true
      } else {
        page = value
      }
    } else {
      invalidPage = true
    }
  }

  return {
    topicSlug: topicSlug && topics.includes(topicSlug) ? topicSlug : null,
    shape: shape && ARTICLE_SHAPES.some((candidate) => candidate.value === shape) ? shape : null,
    levelSlug: levelSlugValue && levels.includes(levelSlugValue) ? levelSlugValue : null,
    page,
    needsRedirect,
    invalidPage,
  }
}

/**
 * The canonical archive address for a set of filters and a page (stage 3 design, 6.3). Page 1 and
 * an unset filter are both omitted, so the same filters always build the same one address: the
 * inverse of parseArchiveQuery. The parameter order (topic, shape, difficulty, page) is fixed and
 * used everywhere a link is built, including Pagination and the filter form's own GET submission.
 */
export function archiveHref(base: string, filters: Partial<ArchiveFilters>, page: number): string {
  const params = new URLSearchParams()
  if (filters.topicSlug) params.set('topic', filters.topicSlug)
  if (filters.shape) params.set('shape', filters.shape)
  if (filters.levelSlug) params.set('difficulty', filters.levelSlug)
  if (page > 1) params.set('page', String(page))
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

/** How many pages a count of articles fills. 0 with nothing: a page 1 request still renders (no results), it is never 404. */
export function pageCount(total: number): number {
  return Math.ceil(total / ARCHIVE_PAGE_SIZE)
}

/** The page a parsed query's `generateMetadata` should treat as canonical: 1 while redirecting there, otherwise the parsed page. */
export function canonicalArchivePage(
  parsed: Pick<ParsedArchiveQuery, 'page' | 'needsRedirect'>,
): number {
  return parsed.needsRedirect ? 1 : parsed.page
}

/**
 * What the archive route (or a topic page reusing it) should do for a parsed query: redirect to
 * the canonical address, 404, or render a page of articles. Shared by both routes so the
 * invalid/redirect/404/fetch sequence (stage 3 design, 6.3) is written once instead of duplicated
 * per route; `getCount`/`getPage` are passed in rather than imported, so this stays free of the
 * cached.ts wrappers that themselves import this module.
 */
export type ArchiveResolution =
  { kind: 'invalid' } | { kind: 'redirect'; href: string } | { kind: 'page'; data: ArchivePage }

export async function resolveArchivePage(
  base: string,
  linkFilters: Partial<ArchiveFilters>,
  dataFilters: ArchiveFilters,
  parsed: ParsedArchiveQuery,
  getCount: (filters: ArchiveFilters) => Promise<number>,
  getPage: (filters: ArchiveFilters, page: number) => Promise<ArticleCard[]>,
): Promise<ArchiveResolution> {
  if (parsed.invalidPage) return { kind: 'invalid' }
  if (parsed.needsRedirect) return { kind: 'redirect', href: archiveHref(base, linkFilters, 1) }
  const totalPages = pageCount(await getCount(dataFilters))
  if (parsed.page !== 1 && parsed.page > totalPages) return { kind: 'invalid' }
  const articles = await getPage(dataFilters, parsed.page)
  return { kind: 'page', data: { articles, page: parsed.page, totalPages } }
}

/** A topic's id for its slug, or null for an unknown slug or no slug. Pure, so a slug collision is testable without a database. */
export function resolveTopicId(
  topics: readonly Pick<TopicRef, 'id' | 'slug'>[],
  slug: string | null,
): number | null {
  if (slug === null) return null
  return topics.find((topic) => topic.slug === slug)?.id ?? null
}

/**
 * A difficulty level's id for its folded slug, or null for an unknown slug or no slug. Two level
 * names can fold to the same slug; `levels` is in display order, so the first by order wins
 * (stage 3b plan).
 */
export function resolveLevelId(
  levels: readonly { id: number; slug: string }[],
  slug: string | null,
): number | null {
  if (slug === null) return null
  return levels.find((level) => level.slug === slug)?.id ?? null
}

/**
 * The `where` clause for the archive's filters: a topic and a level resolve to their database id
 * first (stage 3 design, 6.3). A slug that resolves to no id falls back to the unreachable id -1
 * rather than skipping the clause: callers only ever pass a slug already checked against
 * `allTopics`/`allLevels` (parseArchiveQuery), so this only fires on a lookup/cache inconsistency
 * (e.g. a topic deleted between that check and this query), and even then the result is an empty
 * page, not a crash or a wrongly-unfiltered one.
 */
async function archiveWhere(payload: Payload, filters: ArchiveFilters): Promise<Where> {
  const and: Where[] = []
  if (filters.topicSlug) {
    const topicId = resolveTopicId(await allTopics(payload), filters.topicSlug)
    and.push({ topics: { in: [topicId ?? -1] } })
  }
  if (filters.shape) and.push({ shape: { equals: filters.shape } })
  if (filters.levelSlug) {
    const levelId = resolveLevelId(await allLevels(payload), filters.levelSlug)
    and.push({ difficulty: { equals: levelId ?? -1 } })
  }
  return and.length > 0 ? { and } : {}
}

/** How many published articles match the archive's filters, for pageCount and the "past the last page" check. */
export async function countArchive(payload: Payload, filters: ArchiveFilters): Promise<number> {
  const { totalDocs } = await payload.count({
    collection: 'articles',
    overrideAccess: false,
    where: await archiveWhere(payload, filters),
  })
  return totalDocs
}

/** One page of the archive: published articles matching its filters, newest first. */
export async function findArchivePage(
  payload: Payload,
  filters: ArchiveFilters,
  page: number,
): Promise<ArticleCard[]> {
  const { docs } = await payload.find({
    collection: 'articles',
    overrideAccess: false,
    depth: 0,
    where: await archiveWhere(payload, filters),
    sort: ['-publishedAt', '-id'],
    limit: ARCHIVE_PAGE_SIZE,
    page,
    select: ARTICLE_CARD_SELECT,
  })
  return toArticleCards(payload, docs)
}
