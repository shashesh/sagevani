import { revalidateTag } from 'next/cache'
import type { Payload } from 'payload'

/** The cache tag on every public read (stage 3 design, 4.3). */
export const SITE_TAG = 'site'

/**
 * Expires every cached public page and query at once, so each rebuilds on its next request.
 * Next can do this only while it handles a request. Scripts, migrations and tests that call
 * Payload directly run outside Next, where NEXT_RUNTIME is unset and there is no page to refresh.
 * A failure is logged and never undoes the save that asked for it.
 */
export function refreshSite(logger: Pick<Payload['logger'], 'error'>): void {
  if (!process.env.NEXT_RUNTIME) return
  try {
    revalidateTag(SITE_TAG, { expire: 0 })
  } catch (error) {
    logger.error(
      { err: error },
      'The public pages could not be refreshed. They show the old content until the next change.',
    )
  }
}
