import { describe, expect, it } from 'vitest'

import { articleMetadata } from '@/lib/site/metadata'
import { articlePath } from '@/lib/site/paths'

import { articleView } from '../helpers/site'

describe('articleMetadata', () => {
  it('uses the title and summary, with the article’s canonical path', () => {
    expect(articleMetadata(articleView())).toEqual({
      title: 'Māyā and the rope',
      description: 'A test summary.',
      alternates: { canonical: '/articles/maya-and-the-rope' },
      openGraph: {
        type: 'article',
        siteName: 'SageVani',
        title: 'Māyā and the rope',
        description: 'A test summary.',
        url: '/articles/maya-and-the-rope',
        publishedTime: '2026-10-11T09:30:00.000Z',
        images: undefined,
      },
    })
  })

  it('prefers the SEO overrides', () => {
    const metadata = articleMetadata(
      articleView({ seo: { title: 'An SEO title', description: 'An SEO description.' } }),
    )
    expect([metadata.title, metadata.description]).toEqual(['An SEO title', 'An SEO description.'])
  })

  it('falls back to the summary when only the SEO title is set', () => {
    const metadata = articleMetadata(
      articleView({ seo: { title: 'An SEO title', description: null } }),
    )
    expect([metadata.title, metadata.description]).toEqual(['An SEO title', 'A test summary.'])
  })

  it('has no description or published time of its own when none exist', () => {
    const metadata = articleMetadata(
      articleView({
        seo: { title: 'An SEO title', description: null },
        summary: null,
        publishedAt: null,
      }),
    )
    expect(metadata.title).toBe('An SEO title')
    expect(metadata.description).toBeUndefined()
    expect(metadata.openGraph).toMatchObject({ description: undefined, publishedTime: undefined })
  })

  it('offers the cover photo as the link preview when there is one', () => {
    const photo = { url: '/local-media/x.png', alt: 'A lamp', width: 1200, height: 630 }
    const metadata = articleMetadata(articleView({ cover: { ...articleView().cover, photo } }))
    expect(metadata.openGraph?.images).toEqual([photo])
  })

  it('builds article paths', () => {
    expect(articlePath('maya')).toBe('/articles/maya')
  })
})
