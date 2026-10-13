import { describe, expect, it } from 'vitest'

import { articleMetadata, pageMetadata } from '@/lib/site/metadata'
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
        images: [
          { url: '/og/maya-and-the-rope', width: 1200, height: 630, alt: 'Māyā and the rope' },
        ],
      },
      twitter: { card: 'summary_large_image' },
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

  it('always points the link preview at /og/[slug], with or without a cover photo', () => {
    const photo = { url: '/local-media/x.png', alt: 'A lamp', width: 1200, height: 630 }
    const withPhoto = articleMetadata(articleView({ cover: { ...articleView().cover, photo } }))
    const withoutPhoto = articleMetadata(articleView())
    expect(withPhoto.openGraph?.images).toEqual([
      { url: '/og/maya-and-the-rope', width: 1200, height: 630, alt: 'Māyā and the rope' },
    ])
    expect(withoutPhoto.openGraph?.images).toEqual([
      { url: '/og/maya-and-the-rope', width: 1200, height: 630, alt: 'Māyā and the rope' },
    ])
  })

  it('builds article paths', () => {
    expect(articlePath('maya')).toBe('/articles/maya')
  })
})

describe('pageMetadata', () => {
  it('uses the title and the canonical path', () => {
    expect(pageMetadata({ title: 'About', path: '/about' })).toEqual({
      title: 'About',
      description: undefined,
      alternates: { canonical: '/about' },
    })
  })

  it('carries a description when given one', () => {
    expect(
      pageMetadata({ title: 'About', description: 'Who writes SageVani.', path: '/about' }),
    ).toEqual({
      title: 'About',
      description: 'Who writes SageVani.',
      alternates: { canonical: '/about' },
    })
  })

  it('treats a missing description the same as none', () => {
    expect(
      pageMetadata({ title: 'About', description: null, path: '/about' }).description,
    ).toBeUndefined()
  })
})
