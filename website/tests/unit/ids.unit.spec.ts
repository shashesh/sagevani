import { describe, expect, it } from 'vitest'

import { idOf, isDatabaseId } from '@/lib/ids'

describe('idOf', () => {
  it('returns a number or a string as it is', () => {
    expect(idOf(7)).toBe(7)
    expect(idOf('7')).toBe('7')
  })

  it('returns the id of a populated object', () => {
    expect(idOf({ id: 7, title: 'x' })).toBe(7)
    expect(idOf({ id: 'abc' })).toBe('abc')
  })

  it.each([null, undefined, true, {}, { id: null }, { id: {} }, [], [7]])(
    'returns null for %j',
    (value) => {
      expect(idOf(value)).toBeNull()
    },
  )
})

describe('isDatabaseId', () => {
  it.each([1, 42, 2147483647, '1', '42', '2147483647'])('accepts %j', (value) => {
    expect(isDatabaseId(value)).toBe(true)
  })

  it.each([
    0,
    -1,
    1.5,
    2147483648,
    Number.NaN,
    Infinity,
    '0',
    '',
    '-1',
    '1.5',
    '1e3',
    ' 1',
    '1 ',
    '1; drop',
    '2147483648',
    '99999999999',
    '00000000001',
    '१२३',
    null,
    undefined,
    {},
    [1],
  ])('rejects %j', (value) => {
    expect(isDatabaseId(value)).toBe(false)
  })
})
