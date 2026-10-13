import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { START_HERE_FALLBACK_TITLE, StartHereContent } from '@/components/site/StartHereContent'
import { getStartHere } from '@/lib/site/cached'
import { pageMetadata, siteRobots } from '@/lib/site/metadata'
import { START_HERE_PATH } from '@/lib/site/paths'

/**
 * The Start-here page: the published page's body, then its list of articles as cards, with
 * neither present a 404 (stage 3 design, 6.3). Static: it takes no params.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { page, articles } = await getStartHere()
  // No robots field with nothing to show: the default export below calls notFound() for it (see
  // src/lib/site/metadata.ts's siteRobots and the article page's generateMetadata for why this
  // must be omitted, not just left falsy).
  if (!page && articles.length === 0) return {}
  return {
    ...pageMetadata({ title: page?.title ?? START_HERE_FALLBACK_TITLE, path: START_HERE_PATH }),
    robots: siteRobots(),
  }
}

export default async function StartHerePage() {
  const { page, articles } = await getStartHere()
  if (!page && articles.length === 0) notFound()
  return <StartHereContent page={page} articles={articles} />
}
