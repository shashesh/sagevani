import { MAX_SLUG_LENGTH } from '../slug'

export { MAX_SLUG_LENGTH }

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Whether a route parameter can be a slug (src/lib/slug.ts makes them). Anything else is a 404 before any query. */
export const isSlug = (value: string): boolean =>
  value.length <= MAX_SLUG_LENGTH && SLUG.test(value)
