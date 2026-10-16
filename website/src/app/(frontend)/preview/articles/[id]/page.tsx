import config from '@payload-config'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { executeAuthStrategies, getPayload } from 'payload'

import { ArticleView } from '@/components/article/ArticleView'
import { LivePreviewRefresh } from '@/components/preview/LivePreviewRefresh'
import { findRelatedArticles } from '@/lib/site/articles'
import { siteConfig } from '@/lib/site/config'
import { articlePath } from '@/lib/site/paths'
import { findArticlePreview } from '@/lib/site/preview'

interface ArticlePreviewPageProps {
  params: Promise<{ id: string }>
}

/**
 * Always noindex, whatever SITE_INDEXING says: a preview is never a page worth indexing (stage 3
 * design, 4.4). No robots field when the article is missing: the default export below calls
 * notFound() in that case, and setting robots here would collide with Next's own automatic
 * noindex for the resulting 404 response (see src/lib/site/metadata.ts's siteRobots).
 */
export async function generateMetadata({ params }: ArticlePreviewPageProps): Promise<Metadata> {
  const { id } = await params
  const payload = await getPayload({ config })
  const { user } = await executeAuthStrategies({ headers: await headers(), payload })
  const article = await findArticlePreview(payload, id, user)
  return article ? { title: 'Preview', robots: { index: false, follow: false } } : {}
}

/**
 * An article's latest draft, for staff only (stage 3 design, 4.4). Reading the request's session
 * makes this route dynamic, so it is never cached; public routes never read drafts.
 */
export default async function ArticlePreviewPage({ params }: ArticlePreviewPageProps) {
  const { id } = await params
  const payload = await getPayload({ config })
  const { user } = await executeAuthStrategies({ headers: await headers(), payload })
  const article = await findArticlePreview(payload, id, user)
  if (!article) notFound()
  const topic = article.topics[0]
  const related = topic ? await findRelatedArticles(payload, topic.id, article.id) : []
  return (
    <>
      <LivePreviewRefresh />
      <ArticleView
        article={article}
        related={related}
        shareUrl={`${siteConfig().url}${articlePath(article.slug)}`}
      />
    </>
  )
}
