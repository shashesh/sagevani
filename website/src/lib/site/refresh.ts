import { revalidateTag } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import type { Payload } from 'payload'

/** The cache tag on every public read (stage 3 design, 4.3). */
export const SITE_TAG = 'site'

/**
 * Expires every cached public page and query at once, so each rebuilds on its next request.
 * Next can do this only while it handles a request. Scripts, migrations and tests that call
 * Payload directly run outside Next, where NEXT_RUNTIME is unset and there is no page to refresh.
 * NEXT_RUNTIME means the code was compiled by Next, not that a request is in progress. Code that
 * runs in the Next process outside a request would log an error and not refresh: Payload jobs
 * (for example scheduled publishing), onInit and instrumentation. If those are ever added, they
 * need a different refresh path.
 * A failure is logged and never undoes the save that asked for it.
 */
export function refreshSite(logger: Pick<Payload['logger'], 'error'>): void {
  if (!process.env.NEXT_RUNTIME) return
  try {
    revalidateTag(SITE_TAG, { expire: 0 })
  } catch (error) {
    unstable_rethrow(error)
    logger.error(
      { err: error },
      'The public pages could not be refreshed. They show the old content until the next change.',
    )
  }
}
