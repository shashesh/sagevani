import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { Practice } from './Practice'
import { Tradition } from './Tradition'
import { Verse } from './Verse'

/**
 * The editor for article and page bodies. It has Payload's default features, including images
 * through the upload feature, plus the Verse, Tradition and Practice blocks. Reflection is
 * ordinary text. Embedded relationships are left out: the spec has no use for them, and they
 * could embed any collection, users included.
 */
export const contentEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures.filter((feature) => feature.key !== 'relationship'),
    BlocksFeature({ blocks: [Verse, Tradition, Practice] }),
  ],
})
