import { describe, expect, it } from 'vitest'

import { coverFor, coverTermSize, NO_TOPIC_TINT } from '@/lib/site/cover'

const DHARMA = { tint: { background: '#e3cfa8', text: '#3d2f1c' } }

describe('coverFor', () => {
  it('draws the cover term in the first topic’s tint', () => {
    expect(
      coverFor({ title: 'A title', coverTerm: ' dharma ', firstTopic: DHARMA, photo: null }),
    ).toEqual({
      term: 'dharma',
      title: 'A title',
      background: '#e3cfa8',
      text: '#3d2f1c',
      photo: null,
    })
  })

  it('falls back to the title when there is no cover term', () => {
    expect(
      coverFor({ title: 'A title', coverTerm: '  ', firstTopic: DHARMA, photo: null }).term,
    ).toBe('A title')
  })

  it('uses the no-topic tint for an article without a topic', () => {
    const cover = coverFor({ title: 'A title', firstTopic: null, photo: null })
    expect([cover.background, cover.text]).toEqual([NO_TOPIC_TINT.background, NO_TOPIC_TINT.text])
  })

  it('keeps the photo, which replaces the drawn cover', () => {
    const photo = { url: '/local-media/x.png', alt: 'A lamp', width: 1200, height: 630 }
    expect(coverFor({ title: 'A title', firstTopic: null, photo }).photo).toBe(photo)
  })
})

describe('coverTermSize', () => {
  it('draws short terms largest, and longer ones smaller', () => {
    expect(coverTermSize('dharma')).toBe('short')
    expect(coverTermSize('Twelve chars')).toBe('short')
    expect(coverTermSize('Thirteen char')).toBe('medium')
    expect(coverTermSize('Karma and the right to act')).toBe('long')
  })

  it('counts letters with diacritics once', () => {
    expect(coverTermSize('ṛtaṃ satyaṃ ś')).toBe('medium')
    expect(coverTermSize('ṛtaṃ satyaṃ')).toBe('short')
  })
})
