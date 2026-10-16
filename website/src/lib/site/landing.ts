import type { Payload } from 'payload'

import { idsOf, singleId } from '../ids'
import { ARTICLE_CARD_SELECT, toArticleCards, type ArticleRow } from './articles'
import { text } from './format'
import { findPublishedPage } from './pages'
import { ABOUT_SLUG, pagePath } from './paths'
import { findTopicViews, topicArticleCounts } from './topics'
import type { AboutBox, ArticleCard, LandingSidebar, LandingView, TopicWithCount } from './types'

/** 1 featured + 3 featured picks + 6 latest: the most newest articles the landing page ever needs. */
export const LANDING_NEWEST = 10

/** Up to how many of the newest articles the Latest section shows (stage 3 design, 6.2). */
export const LANDING_LATEST_LIMIT = 6

export interface SelectLandingInput {
  /** Site settings' chosen featured article, or null when none is set. */
  featuredId: number | null
  /** Site settings' featured picks, in order. */
  pickIds: readonly number[]
  /** Up to LANDING_NEWEST newest published articles, newest first. */
  newest: readonly ArticleCard[]
  /** Every card this selection might reference, by id: an id absent here is dropped as unpublished. */
  publishedById: ReadonlyMap<number, ArticleCard>
}

export interface SelectedLanding {
  /** The chosen featured article while published, otherwise the newest; null with nothing published. */
  featured: ArticleCard | null
  /** The published picks, in order, without the featured article. */
  picks: ArticleCard[]
  /** Up to LANDING_LATEST_LIMIT of the newest articles not already shown above. */
  latest: ArticleCard[]
}

/**
 * The landing page's selection (stage 3 design, 6.2): the featured article falls back to the
 * newest published article when the chosen one is missing or unpublished; picks drop an
 * unpublished entry and the featured article itself, so nothing is shown twice; latest drops the
 * featured article and every pick, keeping `newest`'s order. Pure: every input is already resolved
 * data, so this needs no I/O to test (stage 3b plan, test section).
 */
export function selectLanding({
  featuredId,
  pickIds,
  newest,
  publishedById,
}: SelectLandingInput): SelectedLanding {
  const chosenFeatured = featuredId !== null ? (publishedById.get(featuredId) ?? null) : null
  const featured = chosenFeatured ?? newest[0] ?? null

  const picks = pickIds.flatMap((id) => {
    if (featured && id === featured.id) return []
    const card = publishedById.get(id)
    return card ? [card] : []
  })

  const shown = new Set<number>(picks.map((card) => card.id))
  if (featured) shown.add(featured.id)
  const latest = newest.filter((card) => !shown.has(card.id)).slice(0, LANDING_LATEST_LIMIT)

  return { featured, picks, latest }
}

/** The landing page's sidebar (stage 3 design, 6.2): About, Start here and Topics. */
async function findLandingSidebar(
  payload: Payload,
  aboutText: string | null,
  tagline: string,
  startHere: ArticleCard[],
): Promise<LandingSidebar> {
  const [aboutPage, topicViews] = await Promise.all([
    findPublishedPage(payload, ABOUT_SLUG),
    findTopicViews(payload),
  ])
  const counts = await topicArticleCounts(
    payload,
    topicViews.map((view) => view.topic.id),
  )
  const topics: TopicWithCount[] = topicViews.map((view) => ({
    ...view.topic,
    articleCount: counts[String(view.topic.id)] ?? 0,
  }))
  const about: AboutBox = {
    text: aboutText ?? tagline,
    path: aboutPage ? pagePath(ABOUT_SLUG) : null,
  }
  return { about, startHere, topics }
}

/**
 * Everything the landing page shows (stage 3 design, 6.2): one site-settings read, one batched
 * read of every article this page might show (the newest LANDING_NEWEST, plus any of the featured
 * article, picks or Start-here list that isn't already among them), and one `toArticleCards` call
 * over their union, so nothing here causes an N+1 (articles.ts's publishedCardsInOrder does the
 * same for a single list).
 */
export async function findLanding(payload: Payload): Promise<LandingView> {
  const [settings, newestResult] = await Promise.all([
    payload.findGlobal({
      slug: 'siteSettings',
      overrideAccess: false,
      depth: 0,
      select: {
        featuredArticle: true,
        featuredPicks: true,
        startHere: true,
        aboutText: true,
        tagline: true,
      },
    }),
    payload.find({
      collection: 'articles',
      overrideAccess: false,
      depth: 0,
      sort: ['-publishedAt', '-id'],
      pagination: false,
      limit: LANDING_NEWEST,
      select: ARTICLE_CARD_SELECT,
    }),
  ])

  const featuredId = singleId(settings.featuredArticle)
  const pickIds = idsOf(settings.featuredPicks)
  const startHereIds = idsOf(settings.startHere)

  const newestDocs = newestResult.docs
  const newestIds = new Set(newestDocs.map((row) => row.id))
  const extraIds = [
    ...new Set(
      [featuredId, ...pickIds, ...startHereIds].filter(
        (id): id is number => id !== null && !newestIds.has(id),
      ),
    ),
  ]

  const extraDocs: ArticleRow[] =
    extraIds.length === 0
      ? []
      : (
          await payload.find({
            collection: 'articles',
            overrideAccess: false,
            depth: 0,
            where: { id: { in: extraIds } },
            pagination: false,
            select: ARTICLE_CARD_SELECT,
          })
        ).docs

  const cards = await toArticleCards(payload, [...newestDocs, ...extraDocs])
  const byId = new Map(cards.map((card) => [card.id, card]))
  const newestCards = cards.slice(0, newestDocs.length)

  const { featured, picks, latest } = selectLanding({
    featuredId,
    pickIds,
    newest: newestCards,
    publishedById: byId,
  })

  const startHere = startHereIds.flatMap((id) => {
    const card = byId.get(id)
    return card ? [card] : []
  })

  const sidebar = await findLandingSidebar(
    payload,
    text(settings.aboutText),
    settings.tagline,
    startHere,
  )

  return { featured, picks, latest, sidebar }
}
