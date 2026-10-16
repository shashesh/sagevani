import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArticleView } from '@/components/article/ArticleView'
import { getArticle, getRelatedArticles } from '@/lib/site/cached'
import { siteConfig } from '@/lib/site/config'
import { articleMetadata, siteRobots } from '@/lib/site/metadata'
import { articlePath } from '@/lib/site/paths'
import { isSlug } from '@/lib/site/params'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

/**
 * No article is rendered during the build: each renders on its first request and is cached
 * until published content changes (stage 3 design, 4.3).
 */
export function generateStaticParams(): { slug: string }[] {
  return []
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = isSlug(slug) ? await getArticle(slug) : null
  // No robots field when the article is missing: the page's default export calls notFound()
  // below, and setting robots here would collide with Next's own automatic noindex for the
  // resulting 404 response (see src/lib/site/metadata.ts's siteRobots).
  return article ? { ...articleMetadata(article), robots: siteRobots() } : {}
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = isSlug(slug) ? await getArticle(slug) : null
  if (!article) notFound()
  const topic = article.topics[0]
  const related = topic ? await getRelatedArticles(topic.id, article.id) : []
  return (
    <ArticleView
      article={article}
      related={related}
      shareUrl={`${siteConfig().url}${articlePath(article.slug)}`}
    />
  )
}
