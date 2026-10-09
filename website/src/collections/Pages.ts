import type { CollectionConfig } from 'payload'

import { ownerOnly, publishedOrStaff, staffOnly } from '../access/roles'
import { contentEditor } from '../blocks/content-editor'
import { bodyLinksOnlyTo } from './shared/body-links'
import { checkSlug, deriveSlug, slugField } from './shared/slug'

/**
 * About, How SageVani writes, Start here and Privacy. Drafts are on, so a half-written page
 * never goes live (stage 2 design 3.4). The owner writes them; the assistant only reads.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status', 'updatedAt'] },
  versions: { drafts: { autosave: { interval: 2000 } }, maxPerDoc: 0 },
  // Owner-only writes, so pages need none of the articles' publishing guards; copy them if anyone else ever writes pages.
  access: {
    read: publishedOrStaff,
    readVersions: staffOnly,
    create: ownerOnly,
    update: ownerOnly,
    delete: ownerOnly,
  },
  hooks: {
    beforeValidate: [deriveSlug('title')],
    beforeChange: [bodyLinksOnlyTo(['articles', 'pages']), checkSlug],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'body', type: 'richText', editor: contentEditor },
    slugField('Plain ASCII, made from the title when left empty.'),
  ],
}
