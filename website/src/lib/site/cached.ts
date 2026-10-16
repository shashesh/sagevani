import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { ArchiveFilters } from './archive'
import { countArchive, findArchivePage } from './archive'
import { findArticleCard, findPublishedArticle, findRelatedArticles } from './articles'
import { findSiteChrome } from './chrome'
import { findPublicCorrections } from './corrections'
import { findLanding } from './landing'
import { allLevels, allTopics } from './lookups'
import { findPublishedPage, findStartHere } from './pages'
import { SITE_TAG } from './refresh'
import { findTopicViews } from './topics'

/**
 * The public routes' reads, cached until published content changes (stage 3 design, 4.3). Each
 * entry carries the site tag, which refreshSite expires, and its arguments are part of its key.
 * unstable_cache needs Next's request context, so these run only inside Next: the browser tests
 * cover them, and the functions they wrap have their own tests. React's cache around each one
 * shares a result between calls in the same request (generateMetadata and the page run together).
 * The cache key holds this wrapper's source, not the functions it calls, so after changing what
 * they return, clear .next/cache locally: deploys start with an empty cache, and the browser
 * tests' global setup refreshes the site tag.
 */
const CACHE = { tags: [SITE_TAG] }

const payload = () => getPayload({ config })

export const getSiteChrome = cache(
  unstable_cache(async () => findSiteChrome(await payload()), ['site-chrome'], CACHE),
)

export const getArticle = cache(
  unstable_cache(
    async (slug: string) => findPublishedArticle(await payload(), slug),
    ['article'],
    CACHE,
  ),
)

/**
 * A single published article's card fields (stage 3 design, 6.5): the light read `/og/[slug]`
 * draws from, so its own cache entry never carries the heavier article-view fields the page reads.
 */
export const getArticleCard = cache(
  unstable_cache(
    async (slug: string) => findArticleCard(await payload(), slug),
    ['article-card'],
    CACHE,
  ),
)

export const getRelatedArticles = cache(
  unstable_cache(
    async (topicId: number, excludeId: number) =>
      findRelatedArticles(await payload(), topicId, excludeId),
    ['related-articles'],
    CACHE,
  ),
)

export const getCorrections = cache(
  unstable_cache(async () => findPublicCorrections(await payload()), ['corrections'], CACHE),
)

export const getPage = cache(
  unstable_cache(async (slug: string) => findPublishedPage(await payload(), slug), ['page'], CACHE),
)

export const getLevels = cache(
  unstable_cache(async () => allLevels(await payload()), ['levels'], CACHE),
)

/** Every topic's id, name, slug, question and tint, for the archive's filter options and the topic page's lookup. */
export const getTopics = cache(
  unstable_cache(async () => allTopics(await payload()), ['topics'], CACHE),
)

export const getStartHere = cache(
  unstable_cache(async () => findStartHere(await payload()), ['start-here'], CACHE),
)

/**
 * The archive's count and its one page, each cached by its filters (and page, for the page read).
 * The caller (the archive route) must normalize filters to known topic/level slugs and known
 * shape values, and check a requested page against getArchiveCount's result, before calling
 * getArchivePage: an unrecognised filter value or a made-up page number must never become a cache
 * key, or the cache would grow without bound from garbage query strings (stage 3 design, 4.3).
 */
export const getArchiveCount = cache(
  unstable_cache(
    async (filters: ArchiveFilters) => countArchive(await payload(), filters),
    ['archive-count'],
    CACHE,
  ),
)

export const getArchivePage = cache(
  unstable_cache(
    async (filters: ArchiveFilters, page: number) =>
      findArchivePage(await payload(), filters, page),
    ['archive-page'],
    CACHE,
  ),
)

/**
 * Every topic's name, question and intro (stage 3 design, 6.3). The topic page looks up its slug
 * in this cached list, rather than querying by slug directly, so an unknown slug never becomes a
 * new cache key (the same reasoning as getArchiveCount/getArchivePage above).
 */
export const getTopicViews = cache(
  unstable_cache(async () => findTopicViews(await payload()), ['topic-views'], CACHE),
)

/** The landing page's full view (stage 3 design, 6.2): featured, picks, latest and the sidebar. */
export const getLanding = cache(
  unstable_cache(async () => findLanding(await payload()), ['landing'], CACHE),
)
