import { describe, expect, it } from 'vitest'

import { countWords, extractText, findUploadIds } from '@/lib/rich-text'

const text = (value: string) => ({ type: 'text', text: value })
const paragraph = (...children: unknown[]) => ({ type: 'paragraph', children })
const root = (...children: unknown[]) => ({ root: { type: 'root', children } })

describe('extractText', () => {
  it('joins paragraphs with line breaks and inline text without', () => {
    const value = root(
      paragraph(text('Māyā is '), { type: 'link', children: [text('not')] }, text(' illusion.')),
      paragraph(text('Second.')),
    )
    expect(extractText(value)).toBe('Māyā is not illusion.\nSecond.')
  })

  it('reads every text field of a block, and skips its id, name and type', () => {
    const value = root({
      type: 'block',
      fields: {
        id: '65f1c0ffee0000000000abcd',
        blockName: 'my verse',
        blockType: 'verse',
        transliteration: 'karmaṇy evādhikāras te',
        translation: 'Your right is to action alone.',
        location: '2.47',
      },
    })
    expect(extractText(value)).toBe('karmaṇy evādhikāras te\nYour right is to action alone.\n2.47')
  })

  it('separates list items', () => {
    const value = root({
      type: 'list',
      children: [
        { type: 'listitem', children: [text('one')] },
        { type: 'listitem', children: [text('two')] },
      ],
    })
    expect(extractText(value)).toBe('one\ntwo')
  })

  it('turns line breaks and tabs into whitespace', () => {
    const value = root(
      paragraph(text('a'), { type: 'linebreak' }, text('b'), { type: 'tab' }, text('c')),
    )
    expect(extractText(value)).toBe('a\nb c')
  })

  it('returns an empty string for anything that is not editor content', () => {
    expect(extractText(undefined)).toBe('')
    expect(extractText(null)).toBe('')
    expect(extractText('text')).toBe('')
    expect(extractText({ root: null })).toBe('')
  })
})

describe('countWords', () => {
  it('counts words in Latin script, IAST and Devanagari', () => {
    expect(countWords('Māyā is not illusion.')).toBe(4)
    expect(countWords('कर्मण्येवाधिकारस्ते मा फलेषु')).toBe(3)
    expect(countWords("the seeker's path — at dawn")).toBe(5)
    // A verse location splits at its dot: "2" and "47".
    expect(countWords('2.47')).toBe(2)
  })

  it('is zero for empty or punctuation-only text', () => {
    expect(countWords('')).toBe(0)
    expect(countWords(' — … ')).toBe(0)
  })
})

describe('findUploadIds', () => {
  it('finds media images anywhere in the content, by id or populated document', () => {
    const value = root(
      { type: 'upload', relationTo: 'media', value: 7 },
      paragraph(text('between')),
      {
        type: 'list',
        children: [{ type: 'upload', relationTo: 'media', value: { id: 9, alt: 'x' } }],
      },
    )
    expect(findUploadIds(value)).toEqual([7, 9])
  })

  it('ignores other collections and removed images', () => {
    const value = root(
      { type: 'upload', relationTo: 'documents', value: 3 },
      { type: 'upload', relationTo: 'media', value: null },
    )
    expect(findUploadIds(value)).toEqual([])
  })

  it('lists an image used twice once', () => {
    const value = root(
      { type: 'upload', relationTo: 'media', value: 3 },
      { type: 'upload', relationTo: 'media', value: { id: 3 } },
      { type: 'upload', relationTo: 'media', value: 4 },
    )
    expect(findUploadIds(value)).toEqual([3, 4])
  })
})
