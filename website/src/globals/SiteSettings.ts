import type { GlobalConfig, TextFieldSingleValidation, Validate, Where } from 'payload'

import { anyone, ownerOnly } from '../access/roles'

export const DEFAULT_TAGLINE = 'Where silence learns to speak.'

// Drives the admin picker, which offers published articles only. The check on save is
// publishedWhenAdded, because Payload's own check would re-run on every save.
const PUBLISHED: Where = { _status: { equals: 'published' } }

const sitePath: TextFieldSingleValidation = (value) =>
  typeof value === 'string' && /^\/(?![/\\])[^\s\\\x00-\x1f\x7f]*$/.test(value)
    ? true
    : 'Use a path on this site, starting with a single /, such as /articles.'

const ONLY_PUBLISHED = 'Only published articles can be added here.'

const idsOf = (value: unknown): string[] =>
  (Array.isArray(value) ? value : value == null ? [] : [value]).map((entry) =>
    String(typeof entry === 'object' && entry !== null ? (entry as { id?: unknown }).id : entry),
  )

/**
 * The validator for a field that lists articles. It checks additions only: an article already
 * listed stays valid when it is later unpublished, so an unpublished entry never blocks a save.
 * Stage 3 shows published entries only. A custom validator replaces Payload's default one, which
 * would re-check the published-only filter on every save.
 */
const publishedWhenAdded =
  (maxRows?: number): Validate =>
  async (value, { previousValue, req }) => {
    const ids = idsOf(value)
    if (maxRows !== undefined && ids.length > maxRows) return `Choose at most ${maxRows}.`

    const before = new Set(idsOf(previousValue))
    const added = ids.filter((id) => !before.has(id))
    if (added.length === 0) return true

    const { totalDocs } = await req.payload.count({
      collection: 'articles',
      where: { and: [{ id: { in: added } }, { _status: { equals: 'published' } }] },
      overrideAccess: true,
      req,
    })
    return totalDocs < new Set(added).size ? ONLY_PUBLISHED : true
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
