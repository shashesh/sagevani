import { afterEach, describe, expect, it, vi } from 'vitest'
import { countTypedRepetitions, normaliseForMatch } from '@/japa/domain/logic/likhita'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('likhita japa typing', () => {
  it('counts repetitions regardless of case and spacing', () => {
    expect(countTypedRepetitions('sri ram jai ram  SRI RAM jai ram', 'Sri Ram')).toBe(2)
  })

  it('counts Devanagari entries', () => {
    expect(countTypedRepetitions('राम\nराम\nराम', 'राम')).toBe(3)
  })

  it('returns 0 for an empty mantra', () => {
    expect(countTypedRepetitions('anything', '   ')).toBe(0)
  })

  it('does not count the mantra inside a longer word', () => {
    expect(countTypedRepetitions('Soma', 'Om')).toBe(0)
    expect(countTypedRepetitions('Omkar', 'Om')).toBe(0)
    expect(countTypedRepetitions('रामा', 'राम')).toBe(0)
    expect(countTypedRepetitions('परामर्श', 'राम')).toBe(0)
  })

  it('counts entries separated by punctuation, or typed back to back', () => {
    expect(countTypedRepetitions('om, om. om!', 'Om')).toBe(3)
    expect(countTypedRepetitions('रामरामराम', 'राम')).toBe(3)
  })

  it('a mantra ending in punctuation still ends an entry there', () => {
    expect(countTypedRepetitions('श्री राम।राम', 'श्री राम।')).toBe(1)
  })

  it('compares case the same way in every locale', () => {
    // Under Turkish rules, `I` lowercases to a dotless `ı`.
    vi.spyOn(String.prototype, 'toLocaleLowerCase').mockImplementation(function (this: string) {
      return this.toLowerCase().replaceAll('i', 'ı')
    })

    expect(normaliseForMatch('SHIVAYA')).toBe('shivaya')
    expect(countTypedRepetitions('shivaya', 'SHIVAYA')).toBe(1)
  })
})
