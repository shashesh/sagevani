import type { Payload, PayloadRequest } from 'payload'

import { isStaff } from '../../access/roles'
import { isDatabaseId } from '../ids'
import { ARTICLE_SELECT, toArticleView } from './articles'
import { PAGE_SELECT, toPageView } from './pages'
import type { ArticleView, PageView } from './types'

type Viewer = PayloadRequest['user']

/**
 * The latest draft of an article, for the owner or the assistant only (stage 3 design, 4.4).
 * Null for anyone else, for an id that isn't one, and for a missing article, so the route
 * answers 404 without saying whether the article exists.
 */
export async function findArticlePreview(
  payload: Payload,
  id: string,
  viewer: Viewer,
): Promise<ArticleView | null> {
  if (!isStaff(viewer) || !isDatabaseId(id)) return null
  const row = await payload.findByID({
    collection: 'articles',
    id: Number(id),
    draft: true,
    overrideAccess: false,
    user: viewer ?? undefined,
    depth: 0,
    select: ARTICLE_SELECT,
    disableErrors: true,
  })
  return row ? toArticleView(payload, row) : null
}

/** The latest draft of a page, for staff only. */
export async function findPagePreview(
  payload: Payload,
  id: string,
  viewer: Viewer,
): Promise<PageView | null> {
  if (!isStaff(viewer) || !isDatabaseId(id)) return null
  const row = await payload.findByID({
    collection: 'pages',
    id: Number(id),
    draft: true,
    overrideAccess: false,
    user: viewer ?? undefined,
    depth: 0,
    select: PAGE_SELECT,
    disableErrors: true,
  })
  return row ? toPageView(payload, row) : null
}
