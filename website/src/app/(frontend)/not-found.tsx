import type { Metadata } from 'next'

import { NotFoundView } from '@/components/site/NotFoundView'

// No robots field here: Next.js already renders its own, unconditional
// <meta name="robots" content="noindex"> for any response with a status above 400 (see
// NonIndex in next/dist/server/app-render/app-render.js), so a 404 is already never indexed.
// Setting our own robots on top of that would render two <meta name="robots"> tags, since
// Next.js never merges this file's metadata with that automatic tag, it only adds to it.
export const metadata: Metadata = { title: 'Not found' }

/**
 * Renders for a matched route whose content doesn't exist, such as an unpublished or unknown
 * article, page, topic or archive page number (stage 3 design, 6.4). It renders inside the
 * (frontend) layout, so the header and footer appear as on any other page. A genuinely unmatched
 * URL (no route at all) is handled instead by src/app/global-not-found.tsx.
 */
export default function NotFound() {
  return <NotFoundView />
}
