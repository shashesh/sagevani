import { idOf, isDatabaseId } from '../ids'
import { findLinkedDocuments, findUploadIds } from '../rich-text'
import { safeHref } from './links'
import type { PublicImage } from './types'

/** The key of a link target in BodyContext.links. */
export const docKey = (relationTo: string, id: number | string): string => `${relationTo}:${id}`

/** Each well-formed id once, as a number. Anything else never reaches a query. */
export function uniqueIds(values: readonly unknown[]): number[] {
  return [
    ...new Set(
      values
        .map(idOf)
        .filter((id) => isDatabaseId(id))
        .map(Number),
    ),
  ]
}

/** The key form of a well-formed id ("03" and 3 are both "3"), or null. The same rule as uniqueIds. */
function normalId(value: unknown): string | null {
  const id = idOf(value)
  return isDatabaseId(id) ? String(Number(id)) : null
}

export interface BodyReferences {
  articles: number[]
  pages: number[]
  images: number[]
}

/** The articles and pages a body links to, and its images. */
export function bodyReferences(body: unknown): BodyReferences {
  const links = findLinkedDocuments(body).filter((linked) => linked.kind === 'link')
  const linkedIn = (relationTo: string): number[] =>
    uniqueIds(
      links.filter((linked) => linked.relationTo === relationTo).map((linked) => linked.value),
    )
  return {
    articles: linkedIn('articles'),
    pages: linkedIn('pages'),
    images: uniqueIds(findUploadIds(body)),
  }
}

/** Link targets by docKey: published articles at /articles/<slug>, published pages at /<slug>. */
export function linkTargets(
  articles: Record<string, { slug: string }>,
  pages: Record<string, string>,
): Record<string, string> {
  return {
    ...Object.fromEntries(
      Object.entries(articles).map(([id, { slug }]) => [
        docKey('articles', id),
        `/articles/${slug}`,
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(pages).map(([id, slug]) => [docKey('pages', id), `/${slug}`]),
    ),
  }
}

/**
 * A link node's address: a published document's path, or a safe URL. Null renders the link's
 * text without a link (stage 3 design, 4.2).
 */
export function bodyLinkHref(fields: unknown, links: Record<string, string>): string | null {
  if (typeof fields !== 'object' || fields === null) return null
  const { linkType, url, doc } = fields as { linkType?: unknown; url?: unknown; doc?: unknown }
  if (linkType !== 'internal') return safeHref(url)
  const { relationTo, value } = (typeof doc === 'object' && doc !== null ? doc : {}) as {
    relationTo?: unknown
    value?: unknown
  }
  const id = normalId(value)
  return typeof relationTo === 'string' && id !== null
    ? (links[docKey(relationTo, id)] ?? null)
    : null
}

/** An upload node's image, when it is one the page may show. */
export function bodyImage(
  node: { relationTo?: unknown; value?: unknown },
  images: Record<string, PublicImage>,
): PublicImage | null {
  if (node.relationTo !== 'media') return null
  const id = normalId(node.value)
  return id === null ? null : (images[id] ?? null)
}
