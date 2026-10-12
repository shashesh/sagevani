import config from '@payload-config'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { ArticleView } from '@/components/article/ArticleView'
import { LivePreviewRefresh } from '@/components/preview/LivePreviewRefresh'
import { findRelatedArticles } from '@/lib/site/articles'
import { siteConfig } from '@/lib/site/config'
import { articlePath } from '@/lib/site/metadata'
import { findArticlePreview } from '@/lib/site/preview'

export const metadata: Metadata = { title: 'Preview', robots: { index: false, follow: false } }

/**
 * An article's latest draft, for staff only (stage 3 design, 4.4). Reading the request's session
 * makes this route dynamic, so it is never cached; public routes never read drafts.
 */
export default async function ArticlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
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
