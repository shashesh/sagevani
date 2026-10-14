import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { Pagination } from '@/components/archive/Pagination'
import { ArticleListItem } from '@/components/article/ArticleListItem'
import {
  archiveHref,
  pageCount,
  parseArchiveQuery,
  type ArchiveFilters,
  type ArchiveSearchParams,
  type ParsedArchiveQuery,
} from '@/lib/site/archive'
import { getArchiveCount, getArchivePage, getTopicViews } from '@/lib/site/cached'
import { siteRobots } from '@/lib/site/metadata'
import { isSlug } from '@/lib/site/params'
import { topicPath } from '@/lib/site/paths'
import type { TopicView } from '@/lib/site/types'

interface TopicPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<ArchiveSearchParams>
}

/**
 * No page is rendered during the build: each renders on its first request and is cached until
 * published content changes (stage 3 design, 4.1, 4.3).
 */
export function generateStaticParams(): { slug: string }[] {
  return []
}

/**
 * The topic with this slug, or null for an invalid or unknown one. Looked up in the cached list of
 * every topic (getTopicViews) rather than queried directly: an unknown slug must never become a
 * new cache key (stage 3 design, 4.3, the same reasoning as the archive's own filters).
 */
async function loadTopic(slug: string): Promise<TopicView | null> {
  if (!isSlug(slug)) return null
  const views = await getTopicViews()
  return views.find((view) => view.topic.slug === slug) ?? null
}

/**
 * This page has no filters of its own, only pagination (stage 3 design, 6.3): it reuses
 * parseArchiveQuery wholesale rather than factoring out a separate page-only parser, and ignores
 * the topic/shape/difficulty outputs it has no known slugs to check them against anyway.
 */
function parsePage(searchParams: ArchiveSearchParams): ParsedArchiveQuery {
  return parseArchiveQuery(searchParams, { topics: [], levels: [] })
}

export async function generateMetadata({
  params,
  searchParams,
}: TopicPageProps): Promise<Metadata> {
  const { slug } = await params
  const topicView = await loadTopic(slug)
  // No robots field, same as the article and other pages' generateMetadata, when the default
  // export below will call notFound(): Next's own automatic noindex on a 404 must be the only one
  // (src/lib/site/metadata.ts's siteRobots).
  if (!topicView) return {}
  const parsed = parsePage(await searchParams)
  if (parsed.invalidPage) return {}
  const canonicalPage = parsed.needsRedirect ? 1 : parsed.page
  return {
    title: topicView.topic.name,
    description: topicView.topic.question,
    alternates: { canonical: archiveHref(topicPath(slug), {}, canonicalPage) },
    robots: siteRobots(),
  }
}

export default async function TopicPage({ params, searchParams }: TopicPageProps) {
  const { slug } = await params
  const topicView = await loadTopic(slug)
  if (!topicView) notFound()

  const parsed = parsePage(await searchParams)
  if (parsed.invalidPage) notFound()

  const base = topicPath(slug)
  if (parsed.needsRedirect) {
    permanentRedirect(archiveHref(base, {}, 1))
  }

  // The topic is part of the path, not a query filter: data reads filter by it, but the
  // pagination links below carry no filters of their own.
  const dataFilters: ArchiveFilters = {
    topicSlug: topicView.topic.slug,
    shape: null,
    levelSlug: null,
  }
  const linkFilters: ArchiveFilters = { topicSlug: null, shape: null, levelSlug: null }

  const total = await getArchiveCount(dataFilters)
  const totalPages = pageCount(total)
  if (parsed.page !== 1 && parsed.page > totalPages) notFound()

  const articles = await getArchivePage(dataFilters, parsed.page)

  return (
    <div className="page column">
      <h1>{topicView.topic.name}</h1>
      <p>{topicView.topic.question}</p>
      {topicView.intro.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
      {articles.length === 0 ? (
        // Placeholder copy (stage 3 design, 9): rewritten or approved by the owner in review.
        <p>No articles in this topic yet.</p>
      ) : (
        <div>
          {articles.map((article) => (
            <ArticleListItem key={article.id} article={article} headingLevel="h2" />
          ))}
        </div>
      )}
      <Pagination page={parsed.page} totalPages={totalPages} filters={linkFilters} base={base} />
    </div>
  )
}
