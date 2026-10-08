import type { Block } from 'payload'

/** A quoted verse: the text layer of the handbook's four layers (03 Editorial integrity). */
export const Verse: Block = {
  slug: 'verse',
  interfaceName: 'VerseBlock',
  labels: { singular: 'Verse', plural: 'Verses' },
  fields: [
    { name: 'devanagari', type: 'textarea' },
    { name: 'transliteration', type: 'textarea', required: true },
    { name: 'translation', type: 'textarea', required: true },
    { name: 'textName', label: 'Text', type: 'text', required: true },
    {
      name: 'location',
      type: 'text',
      required: true,
      admin: { description: 'The exact location, for example 2.47.' },
    },
    { name: 'translator', label: 'Translator or edition', type: 'text', required: true },
  ],
}
