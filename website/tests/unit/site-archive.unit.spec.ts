import { describe, expect, it } from 'vitest'

import {
  ARCHIVE_PAGE_SIZE,
  archiveHref,
  levelSlug,
  pageCount,
  parseArchiveQuery,
  resolveLevelId,
  resolveTopicId,
} from '@/lib/site/archive'
import { ARCHIVE_PATH } from '@/lib/site/paths'

const TOPICS = [
  { id: 1, slug: 'dharma' },
  { id: 2, slug: 'adhyatma' },
  { id: 3, slug: 'bhakti' },
]

const LEVELS = [
  { id: 1, slug: 'beginner' },
  { id: 2, slug: 'advanced' },
]

describe('levelSlug', () => {
  it('folds a level name the same way a page slug is folded', () => {
    expect(levelSlug('Advanced')).toBe('advanced')
    expect(levelSlug('Beginner')).toBe('beginner')
    expect(levelSlug('Āgama Level')).toBe('agama-level')
  })
})

describe('parseArchiveQuery', () => {
  const lookups = { topics: TOPICS.map((t) => t.slug), levels: LEVELS.map((l) => l.slug) }

  it('gives no filters and page 1, not needing a redirect, with an empty query', () => {
    const result = parseArchiveQuery({}, lookups)
    expect(result).toEqual({
      topicSlug: null,
      shape: null,
      levelSlug: null,
      page: 1,
      needsRedirect: false,
      invalidPage: false,
    })
  })

  it('parses the topic filter alone', () => {
    expect(parseArchiveQuery({ topic: 'adhyatma' }, lookups).topicSlug).toBe('adhyatma')
  })

  it('parses the shape filter alone', () => {
    expect(parseArchiveQuery({ shape: 'vani-note' }, lookups).shape).toBe('vani-note')
  })

  it('parses the difficulty filter alone', () => {
    expect(parseArchiveQuery({ difficulty: 'advanced' }, lookups).levelSlug).toBe('advanced')
  })

  it('parses every filter combined', () => {
    const result = parseArchiveQuery(
      { topic: 'bhakti', shape: 'inquiry-essay', difficulty: 'beginner' },
      lookups,
    )
    expect(result).toMatchObject({
      topicSlug: 'bhakti',
      shape: 'inquiry-essay',
      levelSlug: 'beginner',
    })
  })

  it('ignores an unknown topic, shape or difficulty value', () => {
    const result = parseArchiveQuery(
      { topic: 'no-such-topic', shape: 'no-such-shape', difficulty: 'no-such-level' },
      lookups,
    )
    expect(result).toMatchObject({ topicSlug: null, shape: null, levelSlug: null })
  })

  it('ignores an empty filter value', () => {
    const result = parseArchiveQuery({ topic: '', shape: '', difficulty: '' }, lookups)
    expect(result).toMatchObject({ topicSlug: null, shape: null, levelSlug: null })
  })

  it('uses the first value of a repeated parameter', () => {
    const result = parseArchiveQuery(
      { topic: ['adhyatma', 'bhakti'], difficulty: ['beginner', 'advanced'] },
      lookups,
    )
    expect(result.topicSlug).toBe('adhyatma')
    expect(result.levelSlug).toBe('beginner')
  })

  describe('page', () => {
    it('is page 1, no redirect, when absent', () => {
      expect(parseArchiveQuery({}, lookups)).toMatchObject({
        page: 1,
        needsRedirect: false,
        invalidPage: false,
      })
    })

    it('flags a redirect for the explicit, non-canonical "1"', () => {
      expect(parseArchiveQuery({ page: '1' }, lookups)).toMatchObject({
        page: 1,
        needsRedirect: true,
        invalidPage: false,
      })
    })

    it('accepts a canonical page past 1', () => {
      expect(parseArchiveQuery({ page: '2' }, lookups)).toMatchObject({
        page: 2,
        needsRedirect: false,
        invalidPage: false,
      })
    })

    it('flags every malformed page value as invalid, never as a redirect', () => {
      for (const value of ['0', '-1', '01', '1.5', 'abc', '', ' ', '2 ']) {
        expect(parseArchiveQuery({ page: value }, lookups)).toMatchObject({
          needsRedirect: false,
          invalidPage: true,
        })
      }
    })

    it('uses the first value of a repeated page parameter', () => {
      expect(parseArchiveQuery({ page: ['3', 'abc'] }, lookups).page).toBe(3)
    })
  })
})

describe('resolveTopicId', () => {
  it('gives the id of a known slug, or null for an unknown one or no slug', () => {
    expect(resolveTopicId(TOPICS, 'adhyatma')).toBe(2)
    expect(resolveTopicId(TOPICS, 'no-such-topic')).toBeNull()
    expect(resolveTopicId(TOPICS, null)).toBeNull()
  })
})

describe('resolveLevelId', () => {
  it('gives the id of a known slug, or null for an unknown one or no slug', () => {
    expect(resolveLevelId(LEVELS, 'advanced')).toBe(2)
    expect(resolveLevelId(LEVELS, 'no-such-level')).toBeNull()
    expect(resolveLevelId(LEVELS, null)).toBeNull()
  })

  it('gives the first by order when two level names fold to the same slug', () => {
    const collided = [
      { id: 10, slug: 'beginner' },
      { id: 11, slug: 'beginner' },
    ]
    expect(resolveLevelId(collided, 'beginner')).toBe(10)
  })
})

describe('archiveHref', () => {
  it('gives the bare path with no filters and page 1', () => {
    expect(archiveHref(ARCHIVE_PATH, {}, 1)).toBe('/articles')
  })

  it('omits page 1 even with filters', () => {
    expect(archiveHref(ARCHIVE_PATH, { topicSlug: 'dharma' }, 1)).toBe('/articles?topic=dharma')
  })

  it('includes a page past 1', () => {
    expect(archiveHref(ARCHIVE_PATH, {}, 2)).toBe('/articles?page=2')
  })

  it('orders topic, shape, difficulty, then page', () => {
    expect(
      archiveHref(
        ARCHIVE_PATH,
        { topicSlug: 'dharma', shape: 'vani-note', levelSlug: 'advanced' },
        3,
      ),
    ).toBe('/articles?topic=dharma&shape=vani-note&difficulty=advanced&page=3')
  })

  it('omits a filter that is null or undefined', () => {
    expect(archiveHref(ARCHIVE_PATH, { topicSlug: null, shape: undefined }, 1)).toBe('/articles')
  })
})

describe('pageCount', () => {
  it('is 0 with no items', () => {
    expect(pageCount(0)).toBe(0)
  })

  it('is exact for a multiple of the page size', () => {
    expect(pageCount(ARCHIVE_PAGE_SIZE)).toBe(1)
    expect(pageCount(ARCHIVE_PAGE_SIZE * 2)).toBe(2)
  })

  it('rounds up for a remainder', () => {
    expect(pageCount(ARCHIVE_PAGE_SIZE + 1)).toBe(2)
    expect(pageCount(1)).toBe(1)
  })
})
