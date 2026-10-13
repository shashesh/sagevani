import { describe, expect, it } from 'vitest'

import {
  ABOUT_SLUG,
  ARCHIVE_PATH,
  CORRECTIONS_PATH,
  isReservedPageSlug,
  ogPath,
  RESERVED_PAGE_SLUGS,
  START_HERE_PATH,
  START_HERE_SLUG,
  topicPath,
} from '@/lib/site/paths'

describe('topicPath', () => {
  it("builds a topic's public address", () => {
    expect(topicPath('dharma')).toBe('/topics/dharma')
  })
})

describe('ogPath', () => {
  it("builds an article's link-preview image address", () => {
    expect(ogPath('maya-and-the-rope')).toBe('/og/maya-and-the-rope')
  })
})

describe('fixed route paths and slugs', () => {
  it('matches the routes in the stage 3 design', () => {
    expect(ARCHIVE_PATH).toBe('/articles')
    expect(CORRECTIONS_PATH).toBe('/corrections')
    expect(START_HERE_PATH).toBe('/start-here')
    expect(ABOUT_SLUG).toBe('about')
    expect(START_HERE_SLUG).toBe('start-here')
  })

  it('the Start here slug is the same one isReservedPageSlug allows', () => {
    expect(isReservedPageSlug(START_HERE_SLUG)).toBe(false)
  })
})

describe('isReservedPageSlug', () => {
  it('flags every slug a fixed route always wins over', () => {
    for (const slug of RESERVED_PAGE_SLUGS) {
      expect(isReservedPageSlug(slug)).toBe(true)
    }
  })

  it("allows start-here: it is the Start here page's own slug", () => {
    expect(isReservedPageSlug('start-here')).toBe(false)
  })

  it('allows near-misses', () => {
    expect(isReservedPageSlug('articles-2')).toBe(false)
    expect(isReservedPageSlug('about')).toBe(false)
  })
})
