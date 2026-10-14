import { describe, expect, it } from 'vitest'

import { LANDING_LATEST_LIMIT, LANDING_NEWEST, selectLanding } from '@/lib/site/landing'
import type { ArticleCard } from '@/lib/site/types'

/** A minimal card, enough for selectLanding's identity-based logic. */
function card(id: number): ArticleCard {
  return {
    id,
    slug: `article-${id}`,
    title: `Article ${id}`,
    summary: null,
    shapeLabel: null,
    topics: [],
    difficulty: null,
    readingTime: null,
    publishedAt: null,
    cover: {
      term: `Article ${id}`,
      title: `Article ${id}`,
      background: '#000',
      text: '#fff',
      photo: null,
    },
  }
}

/** `newest` in newest-first order, and a lookup of every card it (and ids beyond it) might need. */
function withCards(ids: number[]): {
  newest: ArticleCard[]
  publishedById: Map<number, ArticleCard>
} {
  const cards = ids.map(card)
  return { newest: cards, publishedById: new Map(cards.map((c) => [c.id, c])) }
}

describe('selectLanding', () => {
  it('uses the chosen featured article when it is published', () => {
    const { newest, publishedById } = withCards([1, 2, 3])
    const result = selectLanding({ featuredId: 2, pickIds: [], newest, publishedById })
    expect(result.featured?.id).toBe(2)
  })

  it('falls back to the newest article when no featured article is chosen', () => {
    const { newest, publishedById } = withCards([1, 2, 3])
    const result = selectLanding({ featuredId: null, pickIds: [], newest, publishedById })
    expect(result.featured?.id).toBe(1)
  })

  it('falls back to the newest article when the chosen one is unpublished', () => {
    const { newest, publishedById } = withCards([1, 2, 3])
    // 99 isn't in publishedById: unpublished, deleted, or never existed.
    const result = selectLanding({ featuredId: 99, pickIds: [], newest, publishedById })
    expect(result.featured?.id).toBe(1)
  })

  it('gives null featured with nothing published', () => {
    const result = selectLanding({
      featuredId: null,
      pickIds: [],
      newest: [],
      publishedById: new Map(),
    })
    expect(result.featured).toBeNull()
  })

  it('removes the featured article from picks when it also appears there, without a gap', () => {
    const { newest, publishedById } = withCards([1, 2, 3, 4])
    const result = selectLanding({ featuredId: 1, pickIds: [1, 2, 3], newest, publishedById })
    expect(result.picks.map((c) => c.id)).toEqual([2, 3])
  })

  it('keeps picks in the given order', () => {
    const { newest, publishedById } = withCards([1, 2, 3, 4])
    const result = selectLanding({ featuredId: 4, pickIds: [3, 1, 2], newest, publishedById })
    expect(result.picks.map((c) => c.id)).toEqual([3, 1, 2])
  })

  it('drops an unpublished pick', () => {
    const { newest, publishedById } = withCards([1, 2, 3])
    const result = selectLanding({ featuredId: 1, pickIds: [2, 99, 3], newest, publishedById })
    expect(result.picks.map((c) => c.id)).toEqual([2, 3])
  })

  it('excludes the featured article and every pick from latest', () => {
    const { newest, publishedById } = withCards([1, 2, 3, 4, 5])
    const result = selectLanding({ featuredId: 1, pickIds: [2, 3], newest, publishedById })
    expect(result.latest.map((c) => c.id)).toEqual([4, 5])
  })

  it('caps latest at LANDING_LATEST_LIMIT', () => {
    expect(LANDING_LATEST_LIMIT).toBe(6)
    const ids = Array.from({ length: LANDING_NEWEST }, (_, index) => index + 1)
    const { newest, publishedById } = withCards(ids)
    // Featured is the newest (id 1), no picks: up to 9 candidates remain for latest, capped at 6.
    const result = selectLanding({ featuredId: 1, pickIds: [], newest, publishedById })
    expect(result.latest).toHaveLength(LANDING_LATEST_LIMIT)
    expect(result.latest.map((c) => c.id)).toEqual([2, 3, 4, 5, 6, 7])
  })

  it('LANDING_NEWEST is exactly 1 featured + 3 picks + 6 latest', () => {
    expect(LANDING_NEWEST).toBe(10)
  })

  it('fills latest exactly when newest holds 1 featured + 3 picks + 6 latest', () => {
    const ids = Array.from({ length: LANDING_NEWEST }, (_, index) => index + 1)
    const { newest, publishedById } = withCards(ids)
    const result = selectLanding({ featuredId: 1, pickIds: [2, 3, 4], newest, publishedById })
    expect(result.latest.map((c) => c.id)).toEqual([5, 6, 7, 8, 9, 10])
  })

  it('gives empty picks and latest with nothing published', () => {
    const result = selectLanding({
      featuredId: null,
      pickIds: [1, 2],
      newest: [],
      publishedById: new Map(),
    })
    expect(result).toEqual({ featured: null, picks: [], latest: [] })
  })
})
