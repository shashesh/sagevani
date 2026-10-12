import type { Payload } from 'payload'

import { parseServerEnv } from '../env'
import { mediaStorageSettings } from '../media-storage'
import { imageSrcFor } from './local-media'
import type { PublicImage, TopicRef } from './types'

// Every read here but publicImages is anonymous: overrideAccess false and no user, so the
// collections' access rules decide what comes back (stage 3 design, 4.2).

/** Every topic, in display order. */
export async function allTopics(payload: Payload): Promise<TopicRef[]> {
  const { docs } = await payload.find({
    collection: 'topics',
    overrideAccess: false,
    depth: 0,
    sort: 'order',
    pagination: false,
    select: { name: true, slug: true, question: true, coverTint: true },
  })
  return docs.map((topic) => ({
    id: topic.id,
    name: topic.name,
    slug: topic.slug ?? '',
    question: topic.question,
    tint: { background: topic.coverTint.background, text: topic.coverTint.text },
  }))
}

/** Difficulty level names by id. */
export async function levelNames(payload: Payload): Promise<Record<string, string>> {
  const { docs } = await payload.find({
    collection: 'difficultyLevels',
    overrideAccess: false,
    depth: 0,
    pagination: false,
    select: { name: true },
  })
  return Object.fromEntries(docs.map((level) => [String(level.id), level.name]))
}

/** Published articles by id, with their slug and current title. The access rules leave out the rest. */
export async function publishedArticles(
  payload: Payload,
  ids: readonly number[],
): Promise<Record<string, { slug: string; title: string }>> {
  if (ids.length === 0) return {}
  const { docs } = await payload.find({
    collection: 'articles',
    overrideAccess: false,
    depth: 0,
    where: { id: { in: [...ids] } },
    pagination: false,
    select: { slug: true, title: true },
  })
  return Object.fromEntries(
    docs.flatMap((article): [string, { slug: string; title: string }][] =>
      article.slug ? [[String(article.id), { slug: article.slug, title: article.title }]] : [],
    ),
  )
}

/** Published pages' slugs by id. */
export async function publishedPageSlugs(
  payload: Payload,
  ids: readonly number[],
): Promise<Record<string, string>> {
  if (ids.length === 0) return {}
  const { docs } = await payload.find({
    collection: 'pages',
    overrideAccess: false,
    depth: 0,
    where: { id: { in: [...ids] } },
    pagination: false,
    select: { slug: true },
  })
  return Object.fromEntries(
    docs.flatMap((page): [string, string][] => (page.slug ? [[String(page.id), page.slug]] : [])),
  )
}

/**
 * Images by id, with only what a page needs. Media is staff-only (stage 2 design, 4.1), so an
 * anonymous read returns nothing. This is the one public read that overrides access: the ids
 * come from content (a preview's come from a draft), and nothing but these fields is read (stage 3 design, 4.2).
 */
export async function publicImages(
  payload: Payload,
  ids: readonly number[],
): Promise<Record<string, PublicImage>> {
  if (ids.length === 0) return {}
  const storage = mediaStorageSettings(parseServerEnv(process.env))
  const { docs } = await payload.find({
    collection: 'media',
    overrideAccess: true,
    depth: 0,
    where: { id: { in: [...ids] } },
    pagination: false,
    select: { filename: true, prefix: true, alt: true, width: true, height: true },
  })
  return Object.fromEntries(
    docs.flatMap((media): [string, PublicImage][] =>
      media.filename && media.width && media.height
        ? [
            [
              String(media.id),
              {
                url: imageSrcFor({ filename: media.filename, prefix: media.prefix }, storage),
                alt: media.alt,
                width: media.width,
                height: media.height,
              },
            ],
          ]
        : [],
    ),
  )
}
