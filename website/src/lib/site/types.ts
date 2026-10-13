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
  /** Formatted for display ("3 October 2026"), not ISO. */
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

/** A topic's name, question and intro, as the topic page shows them (stage 3 design, 6.3). */
export interface TopicView {
  topic: TopicRef
  /** The intro text's paragraphs. */
  intro: string[]
}

/** A topic with its number of published articles, for the landing page's sidebar (6.2). */
export interface TopicWithCount extends TopicRef {
  articleCount: number
}

/** The landing page's About box: aboutText, falling back to the tagline (6.2). */
export interface AboutBox {
  text: string
  /** Null until the About page is published. */
  path: string | null
}

/** The landing page's sidebar, under Latest below 860px (6.2). */
export interface LandingSidebar {
  about: AboutBox
  /** The published articles of the Start-here list, in order. */
  startHere: ArticleCard[]
  /** All four topics, each with its count of published articles. */
  topics: TopicWithCount[]
}

/** The landing page, top to bottom (stage 3 design, 6.2). */
export interface LandingView {
  /** The chosen featured article while published, otherwise the newest; null with nothing published. */
  featured: ArticleCard | null
  /** The published picks from site settings, without the featured article. */
  picks: ArticleCard[]
  /** Up to six of the newest articles not already shown above. */
  latest: ArticleCard[]
  sidebar: LandingSidebar
}

/** A page of articles, filtered and paginated (the archive and a topic page, 6.3). */
export interface ArchivePage {
  articles: ArticleCard[]
  page: number
  totalPages: number
}

/** A public correction, with the article it belongs to (the corrections page, 6.3). */
export interface SiteCorrection extends PublicCorrection {
  /** The correction's own raw date (ISO), kept only to sort across articles; never shown. */
  at: string
  article: {
    title: string
    path: string
    /** The article's publish date (ISO), breaking a tie when two corrections share a date. */
    publishedAt: string | null
  }
}

/** The Start-here page: the published page's body, then its list of articles, as cards (6.3). */
export interface StartHereView {
  page: PageView | null
  articles: ArticleCard[]
}

/** Shown for a draft that has no title yet (preview only: published articles always have one). */
export const UNTITLED = 'Untitled'
