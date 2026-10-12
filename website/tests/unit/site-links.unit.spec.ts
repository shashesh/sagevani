import { describe, expect, it } from 'vitest'

import { safeHref } from '@/lib/site/links'
import { shareLinks } from '@/lib/site/share'

describe('safeHref', () => {
  it('keeps paths on this site and http, https and mailto addresses', () => {
    for (const value of [
      '/articles/maya',
      '/',
      'https://example.org/a?b=c#d',
      'http://example.org',
      'mailto:someone@example.org',
    ]) {
      expect(safeHref(value)).toBe(value)
    }
  })

  it('trims surrounding whitespace', () => {
    expect(safeHref('  https://example.org  ')).toBe('https://example.org')
  })

  it('refuses scripts, data, other schemes and paths that leave the site', () => {
    for (const value of [
      'javascript:alert(1)',
      ' JavaScript:alert(1)',
      'java\tscript:alert(1)',
      'data:text/html,<p>x</p>',
      'ftp://example.org',
      '//evil.example',
      '/\\evil.example',
      'relative/path',
      '',
    ]) {
      expect(safeHref(value)).toBeNull()
    }
  })

  it('refuses anything that is not a string', () => {
    expect(safeHref(undefined)).toBeNull()
    expect(safeHref(null)).toBeNull()
    expect(safeHref(42)).toBeNull()
  })
})

describe('shareLinks', () => {
  const links = shareLinks('https://sagevani.example/articles/maya', 'Māyā & the rope')

  it('shares on WhatsApp with the title and the address in one message', () => {
    expect(links.whatsapp).toBe(
      'https://wa.me/?text=M%C4%81y%C4%81%20%26%20the%20rope%20https%3A%2F%2Fsagevani.example%2Farticles%2Fmaya',
    )
  })

  it('shares by email with the title as the subject', () => {
    expect(links.email).toBe(
      'mailto:?subject=M%C4%81y%C4%81%20%26%20the%20rope&body=https%3A%2F%2Fsagevani.example%2Farticles%2Fmaya',
    )
  })

  it('shares on X with the title and the address', () => {
    expect(links.x).toBe(
      'https://x.com/intent/post?text=M%C4%81y%C4%81%20%26%20the%20rope&url=https%3A%2F%2Fsagevani.example%2Farticles%2Fmaya',
    )
  })
})
