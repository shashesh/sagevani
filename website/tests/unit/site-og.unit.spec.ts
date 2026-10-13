import { describe, expect, it } from 'vitest'

import { COVER_SCALE } from '@/lib/site/cover'
import { loadOgFonts, OG_HEIGHT, OG_WIDTH, ogLayout } from '@/lib/site/og'

const PX_PER_CQW = OG_WIDTH / 100

describe('OG_WIDTH / OG_HEIGHT', () => {
  it('is the link-preview image’s fixed 1200×630 shape', () => {
    expect([OG_WIDTH, OG_HEIGHT]).toEqual([1200, 630])
  })
})

describe('ogLayout', () => {
  it('draws a short term at the largest size', () => {
    expect(ogLayout({ term: 'dharma' }).term.fontSize).toBe(
      Math.round(COVER_SCALE.term.short * PX_PER_CQW),
    )
  })

  it('draws a medium term at the middle size', () => {
    expect(ogLayout({ term: 'karma yoga' }).term.fontSize).toBe(
      Math.round(COVER_SCALE.term.medium * PX_PER_CQW),
    )
  })

  it('draws a long term at the smallest size', () => {
    expect(ogLayout({ term: 'Karma and the right to act' }).term.fontSize).toBe(
      Math.round(COVER_SCALE.term.long * PX_PER_CQW),
    )
  })

  it('resolves the padding, title and mark cqw values at 1200px', () => {
    const layout = ogLayout({ term: 'dharma' })
    expect(layout.padding).toBe(Math.round(COVER_SCALE.padding * PX_PER_CQW))
    expect(layout.title).toEqual({
      marginTop: Math.round(COVER_SCALE.title.marginTop * PX_PER_CQW),
      fontSize: Math.round(COVER_SCALE.title.fontSize * PX_PER_CQW),
    })
    expect(layout.mark).toEqual({
      right: Math.round(COVER_SCALE.mark.right * PX_PER_CQW),
      bottom: Math.round(COVER_SCALE.mark.bottom * PX_PER_CQW),
      fontSize: Math.round(COVER_SCALE.mark.fontSize * PX_PER_CQW),
    })
  })
})

describe('loadOgFonts', () => {
  it('loads both static Literata cuts as non-empty buffers, correctly styled', async () => {
    const fonts = await loadOgFonts()
    expect(fonts).toHaveLength(2)
    for (const font of fonts) {
      expect(font.name).toBe('Literata')
      expect(Buffer.isBuffer(font.data)).toBe(true)
      expect(font.data.length).toBeGreaterThan(0)
    }
    const italic = fonts.find((font) => font.style === 'italic')
    const medium = fonts.find((font) => font.style === 'normal')
    expect(italic?.weight).toBe(400)
    expect(medium?.weight).toBe(500)
  })
})
