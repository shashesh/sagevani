import { randomBytes, randomUUID } from 'crypto'

import type { Article } from '@/payload-types'

type RichText = NonNullable<Article['body']>
type LexicalNode = RichText['root']['children'][number]

const blockId = (): string => randomBytes(12).toString('hex')

export const paragraph = (text: string): LexicalNode => ({
  type: 'paragraph',
  version: 1,
  format: '',
  indent: 0,
  direction: 'ltr',
  textFormat: 0,
  children: [{ type: 'text', version: 1, text, format: 0, mode: 'normal', style: '', detail: 0 }],
})

export const verse = (fields: {
  devanagari?: string
  transliteration: string
  translation: string
  textName: string
  location: string
  translator: string
}): LexicalNode => ({
  type: 'block',
  version: 2,
  format: '',
  fields: { id: blockId(), blockName: '', blockType: 'verse', ...fields },
})

export const image = (mediaId: number): LexicalNode => ({
  type: 'upload',
  version: 3,
  format: '',
  id: randomUUID(),
  relationTo: 'media',
  value: mediaId,
  fields: null,
})

export const richText = (...children: LexicalNode[]): RichText => ({
  root: { type: 'root', version: 1, format: '', indent: 0, direction: 'ltr', children },
})
