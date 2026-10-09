import { describe, expect, it } from 'vitest'

import { readingTime, searchTextFrom, WORDS_PER_MINUTE } from '@/lib/article-text'

describe('readingTime', () => {
  it('is at least one minute', () => {
    expect(readingTime(0)).toBe(1)
    expect(readingTime(1)).toBe(1)
  })

  it('rounds up at 200 words a minute', () => {
    expect(WORDS_PER_MINUTE).toBe(200)
    expect(readingTime(200)).toBe(1)
    expect(readingTime(201)).toBe(2)
    expect(readingTime(1000)).toBe(5)
  })
})

describe('searchTextFrom', () => {
  it('lowercases, folds diacritics and collapses whitespace, so "maya" finds "Māyā"', () => {
    expect(searchTextFrom(['Māyā and the Rope', 'One  line.\nSecond'])).toBe(
      'maya and the rope one line. second',
    )
  })

  it('skips missing parts', () => {
    expect(searchTextFrom([null, 'Sādhanā', undefined, ''])).toBe('sadhana')
  })

  it('keeps Devanagari words whole', () => {
    expect(searchTextFrom(['कि', 'की'])).toBe('कि की')
  })
})
