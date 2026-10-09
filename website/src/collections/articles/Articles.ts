import type { CollectionConfig, Where } from 'payload'

import { nobody, ownerOnly, publishedOrStaff, staffOnly, staffOnlyField } from '../../access/roles'
import { contentEditor } from '../../blocks/content-editor'
import { bodyLinksOnlyTo } from '../shared/body-links'
import { checkSlug, deriveSlug, slugField } from '../shared/slug'
import {
  autosaveOnlyForDrafts,
  recordApproval,
  recordApprovedVersion,
  refuseBulkPublish,
} from './approval'
import { deriveArticleText } from './derived-text'
import { draftsOnlyForAssistant } from './drafts-only'
import { editorialChecklist } from './editorial-checklist'
import { enforcePublishRules } from './publish-rules'

export const ARTICLE_SHAPES = [
  { label: 'Vani Note', value: 'vani-note' },
  { label: 'Inquiry Essay', value: 'inquiry-essay' },
  { label: 'Text / Story Study', value: 'text-story-study' },
  { label: 'Practice Journal', value: 'practice-journal' },
]

export const SOURCE_TYPES = [
  { label: 'Primary text', value: 'primary-text' },
  { label: 'Commentary', value: 'commentary' },
  { label: 'Academic', value: 'academic' },
  { label: 'Living tradition', value: 'living-tradition' },
  { label: 'General', value: 'general' },
]

/** Fields only the server writes, in hooks: no API request can set them, the owner's included. */
const SERVER_ONLY = { create: nobody, update: nobody }
/** Server-only, and never shown to the public. */
const SERVER_ONLY_STAFF_READ = { read: staffOnlyField, ...SERVER_ONLY }

/** A prior reading can only be a published article. */
const PUBLISHED_ONLY: Where = { _status: { equals: 'published' } }

const isInternal = (_: unknown, sibling: { kind?: unknown }): boolean =>
  sibling?.kind === 'internal'
const isExternal = (_: unknown, sibling: { kind?: unknown }): boolean =>
  sibling?.kind !== 'internal'

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'shape', '_status', 'updatedAt'],
  },
  versions: {
    drafts: { autosave: { interval: 2000 } },
    // Keep every version: the approval record points at one by id.
    maxPerDoc: 0,
  },
  access: {
    read: publishedOrStaff,
    readVersions: staffOnly,
    create: staffOnly,
    update: staffOnly,
    delete: ownerOnly,
  },
  hooks: {
    beforeOperation: [draftsOnlyForAssistant, refuseBulkPublish, autosaveOnlyForDrafts],
    beforeValidate: [deriveSlug('title')],
    beforeChange: [
      bodyLinksOnlyTo(['articles']),
      checkSlug,
      deriveArticleText,
      enforcePublishRules,
      recordApproval,
    ],
    afterChange: [recordApprovedVersion],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'summary',
      type: 'textarea',
      admin: { description: 'One sentence, shown under the title and in lists.' },
    },
    { name: 'shape', type: 'select', required: true, options: ARTICLE_SHAPES },
    { name: 'topics', type: 'relationship', relationTo: 'topics', hasMany: true },
    {
      name: 'difficulty',
      type: 'relationship',
      relationTo: 'difficultyLevels',
      admin: { description: 'Required to publish.' },
    },
    { name: 'background', label: 'Helpful background', type: 'textarea' },
    {
      name: 'readFirst',
      label: 'Suggested prior reading',
      labels: { singular: 'Prior reading', plural: 'Prior readings' },
      type: 'array',
      fields: [
        {
          name: 'kind',
          type: 'radio',
          required: true,
          defaultValue: 'external',
          options: [
            { label: 'SageVani article', value: 'internal' },
            { label: 'Elsewhere', value: 'external' },
          ],
        },
        {
          name: 'article',
          type: 'relationship',
          relationTo: 'articles',
          filterOptions: PUBLISHED_ONLY,
          admin: { condition: isInternal },
        },
        { name: 'title', type: 'text', admin: { condition: isExternal } },
        { name: 'author', type: 'text', admin: { condition: isExternal } },
        { name: 'url', label: 'URL', type: 'text', admin: { condition: isExternal } },
        { name: 'reason', label: 'Why it helps', type: 'textarea' },
      ],
    },
    { name: 'body', type: 'richText', editor: contentEditor },
    {
      name: 'sources',
      type: 'array',
      labels: { singular: 'Source', plural: 'Sources' },
      fields: [
        { name: 'type', type: 'select', required: true, options: SOURCE_TYPES },
        { name: 'work', type: 'text', required: true },
        { name: 'author', label: 'Author or commentator', type: 'text' },
        { name: 'edition', label: 'Edition or translator', type: 'text' },
        { name: 'location', label: 'Exact location', type: 'text' },
        { name: 'url', label: 'URL', type: 'text' },
        { name: 'accessedOn', label: 'Access date', type: 'date' },
        { name: 'claim', label: 'Claim supported', type: 'textarea' },
      ],
    },
    {
      name: 'coverTerm',
      type: 'text',
      admin: { description: 'Drawn on the generated cover; the title is used when empty.' },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Replaces the generated cover.' },
    },
    {
      name: 'corrections',
      type: 'array',
      labels: { singular: 'Correction', plural: 'Corrections' },
      fields: [
        { name: 'date', type: 'date', required: true },
        { name: 'change', label: 'What changed', type: 'textarea', required: true },
        {
          name: 'showPublicNote',
          label: 'Show a public note',
          type: 'checkbox',
          defaultValue: true,
        },
      ],
    },
    {
      name: 'seo',
      label: 'SEO',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
      ],
    },
    editorialChecklist,
    // Sidebar
    slugField('Plain ASCII, made from the title when left empty.'),
    {
      name: 'sendEmail',
      label: 'Email subscribers on first publish',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      access: SERVER_ONLY,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'readingTime',
      label: 'Reading time (minutes)',
      type: 'number',
      access: SERVER_ONLY,
      admin: { position: 'sidebar', readOnly: true },
    },
    { name: 'searchText', type: 'textarea', access: SERVER_ONLY, admin: { hidden: true } },
    {
      name: 'approval',
      type: 'group',
      access: SERVER_ONLY_STAFF_READ,
      admin: { position: 'sidebar', readOnly: true },
      fields: [
        { name: 'approvedBy', type: 'relationship', relationTo: 'users' },
        { name: 'approvedAt', type: 'date' },
        { name: 'versionId', type: 'text' },
      ],
    },
    {
      name: 'emailSentAt',
      type: 'date',
      access: SERVER_ONLY_STAFF_READ,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'emailRecipients',
      type: 'number',
      access: SERVER_ONLY_STAFF_READ,
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
