import type { Payload } from 'payload'

import type { Article } from '../../payload-types'
import { idOf } from '../ids'
import { bodyReferences, linkTargets, uniqueIds } from './body'
import { coverFor } from './cover'
import { publicCorrections } from './corrections'
import { shapeLabel, text } from './format'
import { safeHref } from './links'
import { articlePath } from './paths'
import {
  allTopics,
  levelNames,
  publicImages,
  publishedArticles,
  publishedPageSlugs,
} from './lookups'
import { groupSources } from './sources'
import {
  UNTITLED,
  type ArticleCard,
  type ArticleView,
  type PriorReading,
  type PublicImage,
  type TopicRef,
} from './types'

/** How many related articles the article page shows. */
export const RELATED_LIMIT = 3

/** What a card needs. Staff-only fields are never selected, and their access rules hide them anyway. */
export const ARTICLE_CARD_SELECT = {
  title: true,
  slug: true,
  summary: true,
  shape: true,
  topics: true,
  difficulty: true,
  readingTime: true,
  publishedAt: true,
  coverTerm: true,
  coverImage: true,
} as const

export const ARTICLE_SELECT = {
  ...ARTICLE_CARD_SELECT,
  background: true,
  readFirst: true,
  body: true,
  sources: true,
  corrections: true,
  seo: true,
} as const

/** An article as these selects read it. Fields are optional: a preview reads drafts, which may be incomplete. */
export type ArticleRow = Pick<Article, 'id'> & Partial<Pick<Article, keyof typeof ARTICLE_SELECT>>

interface Lookups {
  topics: Map<string, TopicRef>
  levels: Record<string, string>
  images: Record<string, PublicImage>
}

const topicsById = (topics: readonly TopicRef[]): Map<string, TopicRef> =>
  new Map(topics.map((topic) => [String(topic.id), topic]))

function toCard(row: ArticleRow, { topics, levels, images }: Lookups): ArticleCard {
  // The article's own order of topics, each once: the first gives the cover tint and "More from".
  const articleTopics = [
    ...new Set((row.topics ?? []).map((value) => topics.get(String(idOf(value))))),
  ].filter((topic): topic is TopicRef => topic !== undefined)
  const coverId = idOf(row.coverImage)
  const difficultyId = idOf(row.difficulty)
  const title = text(row.title) ?? UNTITLED
  return {
    id: row.id,
    slug: row.slug ?? '',
    title,
    summary: text(row.summary),
    shapeLabel: shapeLabel(row.shape),
    topics: articleTopics,
    difficulty: difficultyId === null ? null : (levels[String(difficultyId)] ?? null),
    readingTime: row.readingTime ?? null,
    publishedAt: row.publishedAt ?? null,
    cover: coverFor({
      title,
      coverTerm: row.coverTerm,
      firstTopic: articleTopics[0] ?? null,
      photo: coverId === null ? null : (images[String(coverId)] ?? null),
    }),
  }
}

/** Cards for article rows, with one batched read of what they share. */
export async function toArticleCards(
  payload: Payload,
  rows: readonly ArticleRow[],
): Promise<ArticleCard[]> {
  const [topics, levels, images] = await Promise.all([
    allTopics(payload),
    levelNames(payload),
    publicImages(payload, uniqueIds(rows.map((row) => row.coverImage))),
  ])
  const byId = topicsById(topics)
  return rows.map((row) => toCard(row, { topics: byId, levels, images }))
}

function priorReadings(
  items: ArticleRow['readFirst'],
  articles: Record<string, { slug: string; title: string }>,
): PriorReading[] {
  return (items ?? []).flatMap((item): PriorReading[] => {
    const reason = text(item.reason)
    if (item.kind === 'internal') {
      const target = articles[String(idOf(item.article))]
      return target
        ? [{ title: target.title, href: articlePath(target.slug), author: null, reason }]
        : []
    }
    const title = text(item.title)
    return title ? [{ title, href: safeHref(item.url), author: text(item.author), reason }] : []
  })
}

/**
 * Everything the article page shows. Links and prior readings reach only published articles,
 * whoever is reading, so a preview shows what the public will see.
 */
export async function toArticleView(payload: Payload, row: ArticleRow): Promise<ArticleView> {
  const refs = bodyReferences(row.body)
  const readFirstIds = uniqueIds(
    (row.readFirst ?? []).filter((item) => item.kind === 'internal').map((item) => item.article),
  )
  const [topics, levels, images, articles, pages] = await Promise.all([
    allTopics(payload),
    levelNames(payload),
    publicImages(payload, uniqueIds([row.coverImage, ...refs.images])),
    publishedArticles(payload, uniqueIds([...refs.articles, ...readFirstIds])),
    publishedPageSlugs(payload, refs.pages),
  ])
  return {
    ...toCard(row, { topics: topicsById(topics), levels, images }),
    background: text(row.background),
    readFirst: priorReadings(row.readFirst, articles),
    body: row.body ?? null,
    bodyContext: { images, links: linkTargets(articles, pages) },
    sources: groupSources(row.sources),
    corrections: publicCorrections(row.corrections),
    seo: { title: text(row.seo?.title), description: text(row.seo?.description) },
  }
}

/** The published article with this slug, or null. */
export async function findPublishedArticle(
  payload: Payload,
  slug: string,
): Promise<ArticleView | null> {
  const { docs } = await payload.find({
    collection: 'articles',
    overrideAccess: false,
    depth: 0,
    where: { slug: { equals: slug } },
    pagination: false,
    limit: 1,
    select: ARTICLE_SELECT,
  })
  return docs[0] ? toArticleView(payload, docs[0]) : null
}

/**
 * A single published article's card, by slug, or null (stage 3 design, 6.5): the light read
 * `/og/[slug]` draws from, rather than the full article view's heavier fields.
 */
export async function findArticleCard(payload: Payload, slug: string): Promise<ArticleCard | null> {
  const { docs } = await payload.find({
    collection: 'articles',
    overrideAccess: false,
    depth: 0,
    where: { slug: { equals: slug } },
    pagination: false,
    limit: 1,
    select: ARTICLE_CARD_SELECT,
  })
  const [row] = docs
  return row ? (await toArticleCards(payload, [row]))[0]! : null
}

/**
 * Cards for an ordered list of article ids, such as site settings' Start-here list (stage 3
 * design, 6.3) or its featured picks: an id that is unpublished or no longer exists is dropped,
 * the given order is kept for the rest, and every card comes from one batched read.
 */
export async function publishedCardsInOrder(
  payload: Payload,
  ids: readonly number[],
): Promise<ArticleCard[]> {
  if (ids.length === 0) return []
  const { docs } = await payload.find({
    collection: 'articles',
    overrideAccess: false,
    depth: 0,
    where: { id: { in: [...ids] } },
    pagination: false,
    select: ARTICLE_CARD_SELECT,
  })
  const byId = new Map(docs.map((row) => [row.id, row]))
  const ordered = ids.flatMap((id) => {
    const row = byId.get(id)
    return row ? [row] : []
  })
  return toArticleCards(payload, ordered)
}

/** Other published articles from a topic, newest first. */
export async function findRelatedArticles(
  payload: Payload,
  topicId: number,
  excludeId: number,
  limit = RELATED_LIMIT,
): Promise<ArticleCard[]> {
  const { docs } = await payload.find({
    collection: 'articles',
    overrideAccess: false,
    depth: 0,
    where: { and: [{ topics: { in: [topicId] } }, { id: { not_equals: excludeId } }] },
    sort: ['-publishedAt', '-id'],
    pagination: false,
    limit,
    select: ARTICLE_CARD_SELECT,
  })
  return toArticleCards(payload, docs)
}
