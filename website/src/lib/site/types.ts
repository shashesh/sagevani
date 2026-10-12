import type { Article } from '../../payload-types'
import type { SourceGroup } from './sources'

/** Serialized editor content, as Payload stores it. */
export type RichTextValue = NonNullable<Article['body']>

/** An image a public page may show: only these four fields ever leave the media collection. */
export interface PublicImage {
  url: string
  alt: string
  width: number
  height: number
}

export interface Tint {
  background: string
  text: string
}

export interface TopicRef {
  id: number
  name: string
  slug: string
  question: string
  tint: Tint
}

export interface CoverData {
  /** The large word: the cover term, or the title when there is none. */
  term: string
  title: string
  background: string
  text: string
  /** A cover photo replaces the drawn cover. */
  photo: PublicImage | null
}

export interface ArticleCard {
  id: number
  slug: string
  title: string
  summary: string | null
  /** The shape's label, such as "Inquiry Essay". */
  shapeLabel: string | null
  /** In the article's own order: the first gives the cover tint and "More from". */
  topics: TopicRef[]
  difficulty: string | null
  readingTime: number | null
  publishedAt: string | null
  cover: CoverData
}

export interface PriorReading {
  title: string
  href: string | null
  author: string | null
  reason: string | null
}

export interface PublicCorrection {
  date: string
  change: string
}

/**
 * What the body renderer needs beyond the content: its images by id, and its link targets by
 * `relationTo:id`. Plain objects, so the cache can store them.
 */
export interface BodyContext {
  images: Record<string, PublicImage>
  links: Record<string, string>
}

export interface ArticleView extends ArticleCard {
  background: string | null
  readFirst: PriorReading[]
  body: RichTextValue | null
  bodyContext: BodyContext
  sources: SourceGroup[]
  corrections: PublicCorrection[]
  seo: { title: string | null; description: string | null }
}

export interface PageView {
  id: number
  slug: string
  title: string
  body: RichTextValue | null
  bodyContext: BodyContext
}

export interface NavigationLink {
  label: string
  path: string
}

export interface SiteChrome {
  tagline: string
  footerMotto: string | null
  navigation: NavigationLink[]
}

/** Shown for a draft that has no title yet (preview only: published articles always have one). */
export const UNTITLED = 'Untitled'
