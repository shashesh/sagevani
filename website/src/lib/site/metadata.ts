import type { Metadata } from 'next'

import { articlePath } from './paths'
import type { ArticleView } from './types'

/**
 * An article's title, description, canonical address and link preview (stage 3 design, 6.1).
 * Addresses are relative: the layout's metadataBase (SITE_URL) makes them absolute. Until stage
 * 3b builds /og/[slug], an article without a cover photo has no link-preview image.
 */
export function articleMetadata(article: ArticleView): Metadata {
  const title = article.seo.title ?? article.title
  const description = article.seo.description ?? article.summary ?? undefined
  const path = articlePath(article.slug)
  const photo = article.cover.photo
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      siteName: 'SageVani',
      title,
      description,
      url: path,
      publishedTime: article.publishedAt ?? undefined,
      images: photo
        ? [{ url: photo.url, width: photo.width, height: photo.height, alt: photo.alt }]
        : undefined,
    },
  }
}
