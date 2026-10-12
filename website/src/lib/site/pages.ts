import type { Payload } from 'payload'

import type { Page } from '../../payload-types'
import { bodyReferences, linkTargets } from './body'
import { publicImages, publishedArticles, publishedPageSlugs } from './lookups'
import { UNTITLED, type PageView } from './types'

export const PAGE_SELECT = { title: true, slug: true, body: true } as const

/** A page as PAGE_SELECT reads it; optional fields because a preview reads drafts. */
export type PageRow = Pick<Page, 'id'> & Partial<Pick<Page, keyof typeof PAGE_SELECT>>

/** A page's title and body, with its images and published link targets. */
export async function toPageView(payload: Payload, row: PageRow): Promise<PageView> {
  const refs = bodyReferences(row.body)
  const [images, articles, pages] = await Promise.all([
    publicImages(payload, refs.images),
    publishedArticles(payload, refs.articles),
    publishedPageSlugs(payload, refs.pages),
  ])
  return {
    id: row.id,
    slug: row.slug ?? '',
    title: row.title?.trim() || UNTITLED,
    body: row.body ?? null,
    bodyContext: { images, links: linkTargets(articles, pages) },
  }
}
