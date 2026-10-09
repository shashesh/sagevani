import type { GlobalConfig, TextFieldSingleValidation, Validate, Where } from 'payload'

import { anyone, ownerOnly } from '../access/roles'
import { isDatabaseId } from '../lib/ids'

export const DEFAULT_TAGLINE = 'Where silence learns to speak.'

// Drives the admin picker, which offers published articles only. The check on save is
// publishedWhenAdded, because Payload's own check would re-run on every save.
const PUBLISHED: Where = { _status: { equals: 'published' } }

const sitePath: TextFieldSingleValidation = (value) =>
  typeof value === 'string' && /^\/(?![/\\])[^\s\\\x00-\x1f\x7f]*$/.test(value)
    ? true
    : 'Use a path on this site, starting with a single /, such as /articles.'

const ONLY_PUBLISHED = 'Only published articles can be added here.'
const NOT_AN_ARTICLE = 'Not a valid article.'
const LISTED_ONCE = 'Each article can be listed once.'

/** The id of one raw entry (an id, or a populated object with one), or null when malformed. */
const entryId = (entry: unknown): string | null => {
  const id =
    typeof entry === 'object' && entry !== null && !Array.isArray(entry)
      ? (entry as { id?: unknown }).id
      : entry
  return isDatabaseId(id) ? String(id) : null
}

/** The raw entries of a field value: none, one, or a list. */
const entriesOf = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : value == null ? [] : [value]

/**
 * The validator for a field that lists articles. Malformed entries are refused before any query,
 * so nothing odd reaches the database. After that it checks additions only: an article already
 * listed stays valid when it is later unpublished, so an unpublished entry never blocks a save.
 * Stage 3 shows published entries only. A custom validator replaces Payload's default one, which
 * would re-check the published-only filter on every save.
 */
const publishedWhenAdded =
  (maxRows?: number): Validate =>
  async (value, { previousValue, req }) => {
    const entries = entriesOf(value)
    const ids = entries.map(entryId)
    if (ids.some((id) => id === null)) return NOT_AN_ARTICLE
    const wanted = ids as string[]
    if (maxRows !== undefined && wanted.length > maxRows) return `Choose at most ${maxRows}.`
    if (new Set(wanted).size < wanted.length) return LISTED_ONCE

    const before = new Set(entriesOf(previousValue).map(entryId))
    const added = wanted.filter((id) => !before.has(id))
    if (added.length === 0) return true

    const { totalDocs } = await req.payload.count({
      collection: 'articles',
      where: { and: [{ id: { in: added } }, { _status: { equals: 'published' } }] },
      overrideAccess: true,
      req,
    })
    return totalDocs < added.length ? ONLY_PUBLISHED : true
  }

/** Curation and site-wide text (website design 5.3 and 8.6). */
export const SiteSettings: GlobalConfig = {
  slug: 'siteSettings',
  label: 'Site settings',
  access: { read: anyone, update: ownerOnly },
  fields: [
    { name: 'tagline', type: 'text', required: true, defaultValue: DEFAULT_TAGLINE },
    {
      name: 'featuredArticle',
      type: 'relationship',
      relationTo: 'articles',
      filterOptions: PUBLISHED,
      validate: publishedWhenAdded(),
    },
    {
      name: 'featuredPicks',
      type: 'relationship',
      relationTo: 'articles',
      hasMany: true,
      maxRows: 3,
      filterOptions: PUBLISHED,
      validate: publishedWhenAdded(3),
    },
    {
      name: 'startHere',
      label: 'Start here',
      type: 'relationship',
      relationTo: 'articles',
      hasMany: true,
      filterOptions: PUBLISHED,
      validate: publishedWhenAdded(),
      admin: { description: 'In reading order.' },
    },
    {
      name: 'navigation',
      type: 'array',
      labels: { singular: 'Link', plural: 'Links' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'path', type: 'text', required: true, validate: sitePath },
      ],
    },
    { name: 'footerMotto', type: 'text' },
  ],
}
