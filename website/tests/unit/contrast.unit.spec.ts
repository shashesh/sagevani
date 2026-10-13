import { describe, expect, it } from 'vitest'

import { contrastRatio, relativeLuminance } from '@/lib/site/contrast'

describe('contrastRatio', () => {
  it('is 21 for black on white, in either order', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5)
  })

  it('is 1 for a colour on itself', () => {
    expect(contrastRatio('#9a3b26', '#9a3b26')).toBe(1)
  })

  it('matches the ratio the website design measured for ink on paper', () => {
    expect(contrastRatio('#2b2621', '#f4efe4')).toBeCloseTo(13.06, 2)
  })

  it('accepts upper-case hex', () => {
    expect(relativeLuminance('#FFFFFF')).toBe(1)
  })

  it('refuses anything but six-digit hex', () => {
    expect(() => relativeLuminance('#fff')).toThrowError('Not a six-digit hex colour: #fff')
    expect(() => relativeLuminance('red')).toThrowError('Not a six-digit hex colour: red')
  })
})
