import { describe, expect, it } from 'vitest'

import {
  bodyImage,
  bodyLinkHref,
  bodyReferences,
  docKey,
  linkTargets,
  uniqueIds,
} from '@/lib/site/body'

import { externalLink, image, linkTo, paragraph, richText } from '../helpers/lexical'

const IMAGE = { url: '/local-media/x.png', alt: 'A lamp', width: 640, height: 400 }

describe('bodyReferences', () => {
  it('finds the linked articles and pages and the images, each once', () => {
    const body = richText(
      paragraph('Text.'),
      linkTo('an article', 'articles', 3),
      linkTo('the same article', 'articles', 3),
      linkTo('a page', 'pages', 5),
      externalLink('elsewhere', 'https://example.org'),
      image(7),
      image(7),
    )
    expect(bodyReferences(body)).toEqual({ articles: [3], pages: [5], images: [7] })
  })

  it('finds nothing in empty or malformed content', () => {
    const none = { articles: [], pages: [], images: [] }
    expect(bodyReferences(null)).toEqual(none)
    expect(bodyReferences({ root: 'not a node' })).toEqual(none)
  })
})

describe('uniqueIds', () => {
  it('keeps well-formed ids once, as numbers', () => {
    expect(uniqueIds([1, '1', '2', { id: 3 }, null, 'x', 0, -4])).toEqual([1, 2, 3])
  })
})

describe('linkTargets', () => {
  it('points published articles at /articles/<slug> and pages at /<slug>', () => {
    expect(linkTargets({ '3': { slug: 'maya' } }, { '5': 'about' })).toEqual({
      [docKey('articles', 3)]: '/articles/maya',
      [docKey('pages', 5)]: '/about',
    })
  })
})

describe('bodyLinkHref', () => {
  const links = { [docKey('articles', 3)]: '/articles/maya' }

  it('gives a published document’s path', () => {
    expect(
      bodyLinkHref({ linkType: 'internal', doc: { relationTo: 'articles', value: 3 } }, links),
    ).toBe('/articles/maya')
  })

  it('gives null for a document that is not published, so the text shows without a link', () => {
    expect(
      bodyLinkHref({ linkType: 'internal', doc: { relationTo: 'articles', value: 4 } }, links),
    ).toBeNull()
  })

  it('keeps a safe address and refuses an unsafe one', () => {
    expect(bodyLinkHref({ linkType: 'custom', url: 'https://example.org' }, links)).toBe(
      'https://example.org',
    )
    expect(bodyLinkHref({ linkType: 'custom', url: 'javascript:alert(1)' }, links)).toBeNull()
  })

  it('reads an id the way uniqueIds does, so "03" finds document 3', () => {
    expect(
      bodyLinkHref({ linkType: 'internal', doc: { relationTo: 'articles', value: '03' } }, links),
    ).toBe('/articles/maya')
  })

  it('gives null for malformed fields', () => {
    expect(bodyLinkHref(null, links)).toBeNull()
    expect(bodyLinkHref({ linkType: 'internal' }, links)).toBeNull()
    expect(bodyLinkHref({ linkType: 'internal', doc: { value: 3 } }, links)).toBeNull()
  })
})

describe('bodyImage', () => {
  const images = { '7': IMAGE }

  it('gives an image the page may show', () => {
    expect(bodyImage({ relationTo: 'media', value: 7 }, images)).toBe(IMAGE)
    expect(bodyImage({ relationTo: 'media', value: { id: 7 } }, images)).toBe(IMAGE)
  })

  it('reads an id the way uniqueIds does, so "07" finds image 7', () => {
    expect(bodyImage({ relationTo: 'media', value: '07' }, images)).toBe(IMAGE)
  })

  it('gives null for an image that is gone or from another collection', () => {
    expect(bodyImage({ relationTo: 'media', value: 8 }, images)).toBeNull()
    expect(bodyImage({ relationTo: 'users', value: 7 }, images)).toBeNull()
  })
})
