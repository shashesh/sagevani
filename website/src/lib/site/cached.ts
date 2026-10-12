import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { findPublishedArticle, findRelatedArticles } from './articles'
import { findSiteChrome } from './chrome'
import { SITE_TAG } from './refresh'

/**
 * The public routes' reads, cached until published content changes (stage 3 design, 4.3). Each
 * entry carries the site tag, which refreshSite expires, and its arguments are part of its key.
 * unstable_cache needs Next's request context, so these run only inside Next: the browser tests
 * cover them, and the functions they wrap have their own tests. The cache key holds this wrapper's source, not
 * the functions it calls, so after changing what they return, clear .next/cache locally: deploys
 * start with an empty cache, and the browser tests' global setup refreshes the site tag.
 */
const CACHE = { tags: [SITE_TAG] }

const payload = () => getPayload({ config })

export const getSiteChrome = unstable_cache(
  async () => findSiteChrome(await payload()),
  ['site-chrome'],
  CACHE,
)

export const getArticle = unstable_cache(
  async (slug: string) => findPublishedArticle(await payload(), slug),
  ['article'],
  CACHE,
)

export const getRelatedArticles = unstable_cache(
  async (topicId: number, excludeId: number) =>
    findRelatedArticles(await payload(), topicId, excludeId),
  ['related-articles'],
  CACHE,
)
