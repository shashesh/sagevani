import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'

import { ArchiveFilters } from '@/components/archive/ArchiveFilters'
import { Pagination } from '@/components/archive/Pagination'
import { ArticleListItem } from '@/components/article/ArticleListItem'
import { ARTICLE_SHAPES } from '@/collections/articles/options'
import {
  archiveHref,
  archivePageIsRenderable,
  canonicalArchivePage,
  parseArchiveQuery,
  resolveArchivePage,
  type ArchiveFilters as ArchiveFiltersType,
  type ArchiveSearchParams,
} from '@/lib/site/archive'
import { getArchiveCount, getArchivePage, getLevels, getTopics } from '@/lib/site/cached'
import { siteRobots } from '@/lib/site/metadata'
import { ARCHIVE_PATH } from '@/lib/site/paths'

interface ArticlesPageProps {
  searchParams: Promise<ArchiveSearchParams>
}

/**
 * Every published article, newest first, filtered and paginated by the query string (stage 3
 * design, 6.3). Renders per request, never during the build: the filters and page come from the
 * query string.
 */
async function resolveQuery(searchParamsPromise: Promise<ArchiveSearchParams>) {
  const [searchParams, topics, levels] = await Promise.all([
    searchParamsPromise,
    getTopics(),
    getLevels(),
  ])
  const parsed = parseArchiveQuery(searchParams, {
    topics: topics.map((topic) => topic.slug),
    levels: levels.map((level) => level.slug),
  })
  const filters: ArchiveFiltersType = {
    topicSlug: parsed.topicSlug,
    shape: parsed.shape,
    levelSlug: parsed.levelSlug,
  }
  return { parsed, filters, topics, levels }
}

export async function generateMetadata({ searchParams }: ArticlesPageProps): Promise<Metadata> {
  const { parsed, filters } = await resolveQuery(searchParams)
  // No robots field for an invalid or out-of-range page: the page's default export calls
  // notFound() for either (resolveArchivePage), and a redirecting address is never the one
  // indexed either (see src/lib/site/metadata.ts's siteRobots and the article page's
  // generateMetadata for why this must be omitted, not just left falsy).
  if (!(await archivePageIsRenderable(filters, parsed, getArchiveCount))) return {}
  // The canonical address drops every filter: a filtered view is one of many ways to reach the
  // same underlying pages, not a page of its own (stage 3 design, 4.6).
  return {
    title: 'Articles',
    alternates: { canonical: archiveHref(ARCHIVE_PATH, {}, canonicalArchivePage(parsed)) },
    robots: siteRobots(),
  }
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps) {
  const { parsed, filters, topics, levels } = await resolveQuery(searchParams)

  const resolution = await resolveArchivePage(
    ARCHIVE_PATH,
    filters,
    filters,
    parsed,
    getArchiveCount,
    getArchivePage,
  )
  if (resolution.kind === 'invalid') notFound()
  if (resolution.kind === 'redirect') permanentRedirect(resolution.href)
  const { articles, totalPages, page } = resolution.data

  return (
    <div className="page column">
      <h1>Articles</h1>
      <ArchiveFilters
        topics={topics.map((topic) => ({ value: topic.slug, label: topic.name }))}
        shapes={ARTICLE_SHAPES.map((shape) => ({ value: shape.value, label: shape.label }))}
        levels={levels.map((level) => ({ value: level.slug, label: level.name }))}
        selected={filters}
      />
      {articles.length === 0 ? (
        // Placeholder copy (stage 3 design, 9): rewritten or approved by the owner in review.
        <p>No articles match these filters yet.</p>
      ) : (
        <div>
          {articles.map((article) => (
            <ArticleListItem key={article.id} article={article} headingLevel="h2" />
          ))}
        </div>
      )}
      <Pagination page={page} totalPages={totalPages} filters={filters} />
    </div>
  )
}
