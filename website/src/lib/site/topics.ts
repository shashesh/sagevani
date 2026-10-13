import type { Payload } from 'payload'

import { paragraphsOf } from './format'
import type { TopicView } from './types'

/**
 * Every topic's name, question and intro, in display order (stage 3 design, 6.3). A dedicated
 * read rather than an extension of `allTopics` (lookups.ts): that function's select is read on
 * every archive request (resolving a topic filter's slug to its id, archive.ts's `archiveWhere`),
 * so it stays limited to what that hot path needs. The topic page is the only caller that needs
 * `intro`, so it reads it separately instead of widening a shared, frequently-called select.
 */
export async function findTopicViews(payload: Payload): Promise<TopicView[]> {
  const { docs } = await payload.find({
    collection: 'topics',
    overrideAccess: false,
    depth: 0,
    sort: 'order',
    pagination: false,
    select: { name: true, slug: true, question: true, coverTint: true, intro: true },
  })
  return docs.map((topic) => ({
    topic: {
      id: topic.id,
      name: topic.name,
      slug: topic.slug ?? '',
      question: topic.question,
      tint: { background: topic.coverTint.background, text: topic.coverTint.text },
    },
    intro: paragraphsOf(topic.intro),
  }))
}

/**
 * How many published articles each topic id has, for the topic page and (later) the landing
 * page's sidebar (6.2, 6.3). One `count` per id, run in parallel: Payload's `count` doesn't
 * support grouping by a relationship, so there is no single grouped query to run instead.
 */
export async function topicArticleCounts(
  payload: Payload,
  ids: readonly number[],
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    ids.map(async (id): Promise<[string, number]> => {
      const { totalDocs } = await payload.count({
        collection: 'articles',
        overrideAccess: false,
        where: { topics: { in: [id] } },
      })
      return [String(id), totalDocs]
    }),
  )
  return Object.fromEntries(entries)
}
