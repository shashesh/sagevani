import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageView } from '@/components/page/PageView'
import { getPage } from '@/lib/site/cached'
import { pageMetadata, siteRobots } from '@/lib/site/metadata'
import { isSlug } from '@/lib/site/params'
import { isReservedPageSlug, pagePath } from '@/lib/site/paths'
import type { PageView as PageViewData } from '@/lib/site/types'

interface SlugPageProps {
  params: Promise<{ slug: string }>
}

/**
 * No page is rendered during the build: each renders on its first request and is cached until
 * published content changes (stage 3 design, 4.1, 4.3).
 */
export function generateStaticParams(): { slug: string }[] {
  return []
}

/**
 * The published page with this slug, or null. A reserved slug (one a fixed route always wins
 * over, design 4.1) never reaches the data layer: it answers 404 before any query, the same as a
 * malformed slug.
 */
async function loadPage(slug: string): Promise<PageViewData | null> {
  if (!isSlug(slug) || isReservedPageSlug(slug)) return null
  return getPage(slug)
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params
  const page = await loadPage(slug)
  // No robots field when the page is missing: the default export below calls notFound(), and
  // setting robots here would collide with Next's own automatic noindex for the resulting 404
  // response (see src/lib/site/metadata.ts's siteRobots).
  return page
    ? { ...pageMetadata({ title: page.title, path: pagePath(page.slug) }), robots: siteRobots() }
    : {}
}

export default async function SlugPage({ params }: SlugPageProps) {
  const { slug } = await params
  const page = await loadPage(slug)
  if (!page) notFound()
  return <PageView page={page} />
}
