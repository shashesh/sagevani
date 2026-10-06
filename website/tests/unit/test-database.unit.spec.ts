import { describe, expect, it } from 'vitest'

import { assertTestDatabase } from '../helpers/test-database'

describe('assertTestDatabase', () => {
  it('accepts a database whose name ends in _test and returns the name', () => {
    expect(assertTestDatabase('postgres://u:p@127.0.0.1:54329/sagevani_test')).toBe('sagevani_test')
  })

  it('ignores query parameters and accepts the postgresql:// scheme', () => {
    expect(
      assertTestDatabase('postgresql://u:p@db.example.com:5432/sagevani_test?sslmode=require'),
    ).toBe('sagevani_test')
  })

  it('refuses when DATABASE_URL is not set', () => {
    expect(() => assertTestDatabase(undefined)).toThrowError(
      'Refusing to run tests: DATABASE_URL is not set.',
    )
    expect(() => assertTestDatabase('')).toThrowError(
      'Refusing to run tests: DATABASE_URL is not set.',
    )
  })

  it('refuses a development database', () => {
    expect(() => assertTestDatabase('postgres://u:p@127.0.0.1:54329/sagevani')).toThrowError(
      'Refusing to run tests: DATABASE_URL must point at a database whose name ends in "_test" (got "sagevani").',
    )
  })

  it('refuses a name that only contains _test', () => {
    expect(() => assertTestDatabase('postgres://u:p@h:5432/sagevani_test_backup')).toThrowError(
      /got "sagevani_test_backup"/,
    )
  })

  it('refuses a URL with no database name', () => {
    expect(() => assertTestDatabase('postgres://u:p@h:5432')).toThrowError(/got "no database name"/)
  })

  it('refuses something that is not a URL', () => {
    expect(() => assertTestDatabase('not a url')).toThrowError(
      'Refusing to run tests: DATABASE_URL is not a valid connection URL.',
    )
  })

  it('never echoes the password in its error', () => {
    expect(() => assertTestDatabase('postgres://user:hunter2@h:5432/production')).toThrowError(
      expect.objectContaining({ message: expect.not.stringContaining('hunter2') }),
    )
  })
})
