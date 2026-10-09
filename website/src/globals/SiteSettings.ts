import type { GlobalConfig, TextFieldSingleValidation, Where } from 'payload'

import { anyone, ownerOnly } from '../access/roles'

export const DEFAULT_TAGLINE = 'Where silence learns to speak.'

// Only published articles can be featured; Payload checks this on save as well as in the picker.
const PUBLISHED: Where = { _status: { equals: 'published' } }

const sitePath: TextFieldSingleValidation = (value) =>
  typeof value === 'string' && /^\/(?!\/)\S*$/.test(value)
    ? true
    : 'Use a path on this site, starting with a single /, such as /articles.'

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
    },
    {
      name: 'featuredPicks',
      type: 'relationship',
      relationTo: 'articles',
      hasMany: true,
      maxRows: 3,
      filterOptions: PUBLISHED,
    },
    {
      name: 'startHere',
      label: 'Start here',
      type: 'relationship',
      relationTo: 'articles',
      hasMany: true,
      filterOptions: PUBLISHED,
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
