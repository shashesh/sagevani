import { describe, expect, it } from 'vitest'

import { describeError } from '@/lib/describe-error'

describe('describeError', () => {
  it('keeps only the first line of the message', () => {
    const error = new Error('first line\n    at stack frame\nsecond line')

    expect(describeError(error, [])).toBe('first line')
  })

  it('replaces every occurrence of a secret', () => {
    const error = new Error('bad token-123 and again token-123')

    expect(describeError(error, ['token-123'])).toBe('bad [redacted] and again [redacted]')
  })

  it('ignores undefined, empty and whitespace-only secrets', () => {
    const error = new Error('plain message')

    expect(describeError(error, [undefined, '', '   '])).toBe('plain message')
  })

  it('describes values that are not errors', () => {
    expect(describeError('just a string', [])).toBe('just a string')
    expect(describeError(42, [])).toBe('42')
  })

  it('redacts the password of a connection-string secret when the message has only the password', () => {
    const url = 'postgres://u:p%40ss-word-1@db.invalid/x'

    expect(describeError(new Error('auth failed for p@ss-word-1'), [url])).toBe(
      'auth failed for [redacted]',
    )
    expect(describeError(new Error('auth failed for p%40ss-word-1'), [url])).toBe(
      'auth failed for [redacted]',
    )
  })

  it('redacts the whole connection string when it appears in the message', () => {
    const url = 'postgres://u:pw-secret-9@db.invalid/x'

    expect(describeError(new Error(`cannot reach ${url}`), [url])).toBe('cannot reach [redacted]')
  })

  it('redacts a secret that spans several lines before keeping the first line', () => {
    const error = new Error('failed with line-one-secret\nline-two-secret and more')

    expect(describeError(error, ['line-one-secret\nline-two-secret'])).toBe(
      'failed with [redacted] and more',
    )
  })

  it('falls back to the error code when the message is empty', () => {
    const error = Object.assign(new AggregateError([], ''), { code: 'ECONNREFUSED' })

    expect(describeError(error, [])).toBe('ECONNREFUSED')
  })

  it('falls back to the error name, then a generic label, when nothing else is available', () => {
    expect(describeError(new TypeError(''), [])).toBe('TypeError')
    expect(describeError('', [])).toBe('Unknown error')
  })
})
