import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { COVER_SCALE, coverFor, coverTermSize, NO_TOPIC_TINT } from '@/lib/site/cover'

const DHARMA = { tint: { background: '#e3cfa8', text: '#3d2f1c' } }

describe('coverFor', () => {
  it('draws the cover term in the first topic’s tint', () => {
    expect(
      coverFor({ title: 'A title', coverTerm: ' dharma ', firstTopic: DHARMA, photo: null }),
    ).toEqual({
      term: 'dharma',
      title: 'A title',
      background: '#e3cfa8',
      text: '#3d2f1c',
      photo: null,
    })
  })

  it('falls back to the title when there is no cover term', () => {
    expect(
      coverFor({ title: 'A title', coverTerm: '  ', firstTopic: DHARMA, photo: null }).term,
    ).toBe('A title')
  })

  it('uses the no-topic tint for an article without a topic', () => {
    const cover = coverFor({ title: 'A title', firstTopic: null, photo: null })
    expect([cover.background, cover.text]).toEqual([NO_TOPIC_TINT.background, NO_TOPIC_TINT.text])
  })

  it('keeps the photo, which replaces the drawn cover', () => {
    const photo = { url: '/local-media/x.png', alt: 'A lamp', width: 1200, height: 630 }
    expect(coverFor({ title: 'A title', firstTopic: null, photo }).photo).toBe(photo)
  })
})

describe('coverTermSize', () => {
  it('draws a term of up to nine letters largest, on one line', () => {
    expect(coverTermSize('dharma')).toBe('short')
    expect(coverTermSize('svādhyāya')).toBe('short')
    expect(coverTermSize('ṛtaṃ sat')).toBe('short')
  })

  it('draws a term of ten to twenty-four letters, with no word over fourteen, in the middle size', () => {
    expect(coverTermSize('karma yoga')).toBe('medium')
    expect(coverTermSize('brahmacharya')).toBe('medium')
    expect(coverTermSize('Twelve chars')).toBe('medium')
    expect(coverTermSize('Satya and ahimsa in life')).toBe('medium')
  })

  it('draws a term longer than twenty-four letters smallest', () => {
    expect(coverTermSize('Karma and the right to act')).toBe('long')
  })

  it('draws a term with a word over fourteen letters smallest, whatever its length', () => {
    expect(coverTermSize('abcdefghijklmn')).toBe('medium')
    expect(coverTermSize('abcdefghijklmno')).toBe('long')
    expect(coverTermSize('pratītyasamutpāda')).toBe('long')
    expect(coverTermSize('Mūlamadhyamakakārikā')).toBe('long')
  })

  it('counts letters with diacritics once, however they are encoded', () => {
    expect(coverTermSize('ṛtaṃ sat')).toBe('short')
    expect(coverTermSize('ṛtaṃ satyaṃ')).toBe('medium')
    expect(coverTermSize('ṛ'.normalize('NFD').repeat(9))).toBe('short')
  })
})

describe('COVER_SCALE', () => {
  const css = readFileSync(path.resolve('src/components/article/Cover.module.css'), 'utf8')

  /** The body of the first rule whose selector is exactly `selector`. */
  function ruleBody(selector: string): string {
    const start = css.indexOf(`${selector} {`)
    if (start === -1) throw new Error(`Cover.module.css has no rule for ${selector}`)
    const open = css.indexOf('{', start)
    return css.slice(open + 1, css.indexOf('}', open))
  }

  /** The cqw number of a declaration such as `font-size: 16cqw;` in a rule's body. */
  function cqw(selector: string, property: string): number {
    const match = new RegExp(`${property}:\\s*([\\d.]+)cqw`).exec(ruleBody(selector))
    if (!match) throw new Error(`${selector} has no ${property} in cqw`)
    return Number(match[1])
  }

  it('matches the padding, term, title and mark cqw values in Cover.module.css', () => {
    expect(cqw('.drawn', 'padding')).toBe(COVER_SCALE.padding)
    expect(cqw('.short .term', 'font-size')).toBe(COVER_SCALE.term.short)
    expect(cqw('.medium .term', 'font-size')).toBe(COVER_SCALE.term.medium)
    expect(cqw('.long .term', 'font-size')).toBe(COVER_SCALE.term.long)
    expect(cqw('.title', 'margin-top')).toBe(COVER_SCALE.title.marginTop)
    expect(cqw('.title', 'font-size')).toBe(COVER_SCALE.title.fontSize)
    expect(cqw('.mark', 'right')).toBe(COVER_SCALE.mark.right)
    expect(cqw('.mark', 'bottom')).toBe(COVER_SCALE.mark.bottom)
    expect(cqw('.mark', 'font-size')).toBe(COVER_SCALE.mark.fontSize)
  })
})
