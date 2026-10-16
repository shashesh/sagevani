import type { Metadata } from 'next'

import { siteConfig } from './config'
import { OG_HEIGHT, OG_WIDTH } from './og'
import { articlePath, ogPath } from './paths'
import type { ArticleView } from './types'

/**
 * Hides a normal page from search engines until launch (stage 3 design, 4.6). Only for a page's
 * own metadata export (generateMetadata or a static `metadata`), never a shared layout's: Next.js
 * reuses a layout's generateMetadata when resolving a not-found render's metadata, so a robots
 * field set there would collide with Next's own, automatic noindex for any response with a status
 * above 400, rendering two <meta name="robots"> tags on every 404 (see (frontend)/not-found.tsx).
 * A page whose own generateMetadata also runs for a response that then calls notFound() (the
 * article page, the preview pages) must omit this entirely for that case, for the same reason.
 */
export function siteRobots(): Metadata['robots'] {
  return siteConfig().indexing ? undefined : { index: false }
}

/**
 * An article's title, description, canonical address and link preview (stage 3 design, 6.1, 6.5).
 * Addresses are relative: the layout's metadataBase (SITE_URL) makes them absolute. The image
 * always points at /og/[slug], photo or no photo: it is the only address that is always exactly
 * 1200×630 and never AVIF, which the raw photo file can be (owner decision, stage 3b).
 */
export function articleMetadata(article: ArticleView): Metadata {
  const title = article.seo.title ?? article.title
  const description = article.seo.description ?? article.summary ?? undefined
  const path = articlePath(article.slug)
  const image = { url: ogPath(article.slug), width: OG_WIDTH, height: OG_HEIGHT, alt: title }
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
      images: [image],
    },
    twitter: { card: 'summary_large_image' },
  }
}

/**
 * A standalone page's title, description and canonical address. The path is relative: the
 * layout's metadataBase (SITE_URL) makes it absolute, as articleMetadata's does.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string
  description?: string | null
  path: string
}): Metadata {
  return {
    title,
    description: description ?? undefined,
    alternates: { canonical: path },
  }
}
