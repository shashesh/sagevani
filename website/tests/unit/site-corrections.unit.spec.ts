import { describe, expect, it } from 'vitest'

import { publicCorrections, sortCorrections } from '@/lib/site/corrections'
import type { SiteCorrection } from '@/lib/site/types'

function correction(overrides: Partial<SiteCorrection> = {}): SiteCorrection {
  return {
    at: '2026-10-05',
    date: '5 October 2026',
    change: 'A note.',
    article: { title: 'An article', path: '/articles/an-article', publishedAt: '2026-10-01' },
    ...overrides,
  }
}

describe('sortCorrections', () => {
  it('orders corrections newest first by their own date', () => {
    const older = correction({ at: '2026-10-01', date: '1 October 2026' })
    const newer = correction({ at: '2026-10-09', date: '9 October 2026' })
    expect(sortCorrections([older, newer])).toEqual([newer, older])
  })

  it('breaks a tie on the same date by the article publish date, newest first', () => {
    const fromOlderArticle = correction({
      at: '2026-10-05',
      change: 'From the older article.',
      article: { title: 'Older article', path: '/articles/older', publishedAt: '2026-09-01' },
    })
    const fromNewerArticle = correction({
      at: '2026-10-05',
      change: 'From the newer article.',
      article: { title: 'Newer article', path: '/articles/newer', publishedAt: '2026-09-20' },
    })
    expect(sortCorrections([fromOlderArticle, fromNewerArticle])).toEqual([
      fromNewerArticle,
      fromOlderArticle,
    ])
  })

  it('does not mutate its argument', () => {
    const first = correction({ at: '2026-10-01' })
    const second = correction({ at: '2026-10-09' })
    const input = [first, second]
    sortCorrections(input)
    expect(input).toEqual([first, second])
  })

  it('gives an empty list for an empty list', () => {
    expect(sortCorrections([])).toEqual([])
  })
})

describe('publicCorrections', () => {
  it('keeps only corrections marked to show a public note, newest first', () => {
    expect(
      publicCorrections([
        { id: '1', date: '2026-10-01', change: 'An older public note.', showPublicNote: true },
        { id: '2', date: '2026-10-05', change: 'A private note.', showPublicNote: false },
        { id: '3', date: '2026-10-09', change: 'A newer public note.', showPublicNote: true },
      ]),
    ).toEqual([
      { date: '9 October 2026', change: 'A newer public note.' },
      { date: '1 October 2026', change: 'An older public note.' },
    ])
  })

  it('skips a draft correction missing a date or a change', () => {
    expect(
      publicCorrections([
        { id: '1', date: '', change: 'No date.', showPublicNote: true },
        { id: '2', date: '2026-10-09', change: '   ', showPublicNote: true },
        { id: '3', date: '2026-10-09', change: '', showPublicNote: true },
      ]),
    ).toEqual([])
  })

  it('gives an empty list for nothing', () => {
    expect(publicCorrections(null)).toEqual([])
    expect(publicCorrections(undefined)).toEqual([])
    expect(publicCorrections([])).toEqual([])
  })
})
