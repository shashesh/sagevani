/** The public address of an article. */
export const articlePath = (slug: string): string => `/articles/${slug}`

/** The public address of a standalone page. */
export const pagePath = (slug: string): string => `/${slug}`
