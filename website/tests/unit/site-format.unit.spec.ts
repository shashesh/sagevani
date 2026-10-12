import { describe, expect, it } from 'vitest'

import { formatDate, paragraphsOf, readingTimeLabel, shapeLabel } from '@/lib/site/format'
import { isSlug } from '@/lib/site/params'
import { PREVIEW_BREAKPOINTS, previewPath } from '@/lib/site/preview-path'
import { readingProgress } from '@/lib/site/progress'

describe('formatDate', () => {
  it('writes the day, the month in full and the year', () => {
    expect(formatDate('2026-10-11T09:30:00.000Z')).toBe('11 October 2026')
  })

  it('uses UTC, so a late-evening date never moves to the next day', () => {
    expect(formatDate('2026-10-11T23:59:59.000Z')).toBe('11 October 2026')
    expect(formatDate('2026-10-12T00:00:00.000Z')).toBe('12 October 2026')
  })

  it('gives null for nothing or for a value that is not a date', () => {
    expect(formatDate(null)).toBeNull()
    expect(formatDate(undefined)).toBeNull()
    expect(formatDate('not a date')).toBeNull()
  })
})

describe('labels', () => {
  it('writes reading time in minutes', () => {
    expect(readingTimeLabel(7)).toBe('7 min read')
  })

  it('names each shape, and gives null for an unknown one', () => {
    expect(shapeLabel('inquiry-essay')).toBe('Inquiry Essay')
    expect(shapeLabel('text-story-study')).toBe('Text / Story Study')
    expect(shapeLabel('poem')).toBeNull()
    expect(shapeLabel(null)).toBeNull()
  })
})

describe('paragraphsOf', () => {
  it('splits at blank lines and trims each paragraph', () => {
    expect(paragraphsOf('First line\nsame paragraph\n\n  Second  \r\n\r\nThird')).toEqual([
      'First line\nsame paragraph',
      'Second',
      'Third',
    ])
  })

  it('gives nothing for empty text', () => {
    expect(paragraphsOf('  \n\n ')).toEqual([])
    expect(paragraphsOf(null)).toEqual([])
  })
})

describe('isSlug', () => {
  it('accepts the slugs the site makes', () => {
    expect(isSlug('maya-and-the-rope')).toBe(true)
    expect(isSlug('gita-2-47')).toBe(true)
    expect(isSlug('x'.repeat(200))).toBe(true)
  })

  it('refuses anything else', () => {
    for (const value of [
      '',
      'Maya',
      'maya--rope',
      '-maya',
      'maya-',
      'māyā',
      'a/b',
      'x'.repeat(201),
    ]) {
      expect(isSlug(value)).toBe(false)
    }
  })
})

describe('previewPath', () => {
  it('points at the preview route for a saved document', () => {
    expect(previewPath('articles', 12)).toBe('/preview/articles/12')
    expect(previewPath('pages', '7')).toBe('/preview/pages/7')
  })

  it('gives null before the document has an id, or for a malformed one', () => {
    expect(previewPath('articles', undefined)).toBeNull()
    expect(previewPath('articles', '1;drop')).toBeNull()
  })

  it('offers phone, tablet and desktop sizes', () => {
    expect(PREVIEW_BREAKPOINTS.map(({ width }) => width)).toEqual([375, 768, 1440])
  })
})

describe('readingProgress', () => {
  it('is 0 before the body reaches the top of the window, and 1 at its end', () => {
    expect(readingProgress(200, 3000, 800)).toBe(0)
    expect(readingProgress(-2200, 3000, 800)).toBe(1)
  })

  it('is the share of the scrollable length read so far', () => {
    expect(readingProgress(-1100, 3000, 800)).toBeCloseTo(0.5)
  })

  it('never leaves 0 to 1', () => {
    expect(readingProgress(-5000, 3000, 800)).toBe(1)
  })

  it('is 1 when the whole body fits in the window', () => {
    expect(readingProgress(100, 500, 800)).toBe(1)
  })
})
