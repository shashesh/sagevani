import type { ArticleView } from '@/lib/site/types'

/** A published article's view, for tests that only render or describe one. */
export function articleView(overrides: Partial<ArticleView> = {}): ArticleView {
  return {
    id: 1,
    slug: 'maya-and-the-rope',
    title: 'Māyā and the rope',
    summary: 'A test summary.',
    shapeLabel: 'Inquiry Essay',
    topics: [],
    difficulty: 'Beginner',
    readingTime: 4,
    publishedAt: '2026-10-11T09:30:00.000Z',
    cover: {
      term: 'māyā',
      title: 'Māyā and the rope',
      background: '#efe6d2',
      text: '#2b2621',
      photo: null,
    },
    background: null,
    readFirst: [],
    body: null,
    bodyContext: { images: {}, links: {} },
    sources: [],
    corrections: [],
    seo: { title: null, description: null },
    ...overrides,
  }
}
