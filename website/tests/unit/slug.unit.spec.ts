import { describe, expect, it } from 'vitest'

import { foldDiacritics, slugify } from '@/lib/slug'

describe('foldDiacritics', () => {
  it('removes diacritics and keeps case', () => {
    expect(foldDiacritics('Māyā')).toBe('Maya')
    expect(foldDiacritics('Śiva and Ṛta')).toBe('Siva and Rta')
  })

  it('folds every IAST letter, small and capital', () => {
    expect(foldDiacritics('ā ī ū ṛ ṝ ḷ ḹ ṃ ḥ ṅ ñ ṭ ḍ ṇ ś ṣ')).toBe(
      'a i u r r l l m h n n t d n s s',
    )
    expect(foldDiacritics('Ā Ī Ū Ṛ Ṝ Ḷ Ḹ Ṃ Ḥ Ṅ Ñ Ṭ Ḍ Ṇ Ś Ṣ')).toBe(
      'A I U R R L L M H N N T D N S S',
    )
  })
})

describe('slugify', () => {
  it('makes plain ASCII words joined by hyphens', () => {
    expect(slugify('Māyā and the Rope')).toBe('maya-and-the-rope')
    expect(slugify('Sādhanā')).toBe('sadhana')
    expect(slugify('Adhyātma')).toBe('adhyatma')
    expect(slugify('jñāna')).toBe('jnana')
  })

  it('collapses punctuation and spaces, and trims hyphens', () => {
    expect(slugify('  --Who am I?  ')).toBe('who-am-i')
    expect(slugify('Text / Story Study')).toBe('text-story-study')
  })

  it('keeps digits', () => {
    expect(slugify('Gītā 2.47')).toBe('gita-2-47')
  })

  it('drops letters that have no ASCII form', () => {
    expect(slugify('karma कर्म')).toBe('karma')
    expect(slugify('कर्म')).toBe('')
  })

  it('returns an empty string for nothing usable', () => {
    expect(slugify('')).toBe('')
    expect(slugify('!!!')).toBe('')
  })
})
