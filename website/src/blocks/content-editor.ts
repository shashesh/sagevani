import { BlocksFeature, LinkFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { Practice } from './Practice'
import { Tradition } from './Tradition'
import { Verse } from './Verse'

/**
 * The editor for article and page bodies. It has Payload's default features, including images
 * through the upload feature, plus the Verse, Tradition and Practice blocks. Reflection is
 * ordinary text. Embedded relationships are left out: the spec has no use for them, and they
 * could embed any collection, users included. Internal links may point at articles only, because a
 * link to an account would let a page populate it. Task 15 adds 'pages'.
 */
export const contentEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures.filter((feature) => !['link', 'relationship'].includes(feature.key)),
    LinkFeature({ enabledCollections: ['articles'] }),
    BlocksFeature({ blocks: [Verse, Tradition, Practice] }),
  ],
})
