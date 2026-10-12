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

const textNode = (text: string) => ({
  type: 'text',
  version: 1,
  text,
  format: 0,
  mode: 'normal',
  style: '',
  detail: 0,
})

const linkParagraph = (text: string, fields: Record<string, unknown>): LexicalNode => ({
  type: 'paragraph',
  version: 1,
  format: '',
  indent: 0,
  direction: 'ltr',
  textFormat: 0,
  children: [
    {
      type: 'link',
      version: 3,
      format: '',
      indent: 0,
      direction: 'ltr',
      fields,
      children: [textNode(text)],
    },
  ],
})

/** A paragraph that is one internal link to an article or page. */
export const linkTo = (text: string, relationTo: 'articles' | 'pages', id: number): LexicalNode =>
  linkParagraph(text, { linkType: 'internal', newTab: false, doc: { relationTo, value: id } })

/** A paragraph that is one link to an address elsewhere. */
export const externalLink = (text: string, url: string): LexicalNode =>
  linkParagraph(text, { linkType: 'custom', newTab: false, url })

export const tradition = (school: string, interpretation: string): LexicalNode => ({
  type: 'block',
  version: 2,
  format: '',
  fields: { id: blockId(), blockName: '', blockType: 'tradition', school, interpretation },
})

export const practice = (invitation: string): LexicalNode => ({
  type: 'block',
  version: 2,
  format: '',
  fields: { id: blockId(), blockName: '', blockType: 'practice', invitation },
})
