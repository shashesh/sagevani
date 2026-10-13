/** The public address of an article. */
export const articlePath = (slug: string): string => `/articles/${slug}`

/** The public address of a standalone page. */
export const pagePath = (slug: string): string => `/${slug}`

/** A topic's public address. */
export const topicPath = (slug: string): string => `/topics/${slug}`

/** An article's link-preview image address (stage 3 design, 6.5). */
export const ogPath = (slug: string): string => `/og/${slug}`

/** Every published article, filtered and paginated by the query string (stage 3 design, 6.3). */
export const ARCHIVE_PATH = '/articles'

/** Every public correction across published articles (stage 3 design, 6.3). */
export const CORRECTIONS_PATH = '/corrections'

/** The Start here page's own address (stage 3 design, 4.1, 6.3). */
export const START_HERE_PATH = '/start-here'

/** The About page's slug, linked from the landing page's About box (stage 3 design, 6.2). */
export const ABOUT_SLUG = 'about'

/** The Start here page's own slug: it is allowed even though it names a fixed route. */
export const START_HERE_SLUG = 'start-here'

/**
 * Slugs a fixed route always wins over, so a page could never be shown there (design 4.1).
 * `start-here` is not here: it is the Start here page's own slug, and `/start-here` serves it.
 */
export const RESERVED_PAGE_SLUGS = new Set([
  'admin',
  'api',
  'articles',
  'topics',
  'search',
  'corrections',
  'subscribe',
  'unsubscribe',
  'og',
  'preview',
  'local-media',
  'japa',
])

/** Whether a page's slug is reserved for a fixed route, so the page editor must refuse it. */
export const isReservedPageSlug = (slug: string): boolean => RESERVED_PAGE_SLUGS.has(slug)
