import { describe, expect, it } from 'vitest'

import { parseServerEnv } from '@/lib/env'

const VALID = {
  DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/sagevani',
  PAYLOAD_SECRET: 'a'.repeat(32),
}

const CA = '-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----'

describe('parseServerEnv', () => {
  it('returns the variables when all are valid', () => {
    expect(parseServerEnv(VALID)).toEqual(VALID)
  })

  it('accepts the postgresql:// scheme', () => {
    const env = {
      ...VALID,
      DATABASE_URL: 'postgresql://u:p@db.example.com:6543/postgres',
      DATABASE_CA_CERT: CA,
    }
    expect(parseServerEnv(env).DATABASE_URL).toBe(env.DATABASE_URL)
  })

  it('names every missing variable in one error', () => {
    expect(() => parseServerEnv({})).toThrowError(
      /DATABASE_URL: is required[\s\S]*PAYLOAD_SECRET: is required/,
    )
  })

  it('rejects a non-postgres connection string', () => {
    expect(() =>
      parseServerEnv({ ...VALID, DATABASE_URL: 'mongodb://127.0.0.1/sagevani' }),
    ).toThrowError(/DATABASE_URL: must be a postgres:\/\/ connection string/)
  })

  it('rejects a short secret', () => {
    expect(() => parseServerEnv({ ...VALID, PAYLOAD_SECRET: 'short' })).toThrowError(
      /PAYLOAD_SECRET: must be at least 32 characters/,
    )
  })

  it('trims whitespace around values, such as a stray space or a Windows line ending', () => {
    const env = parseServerEnv({
      DATABASE_URL: ` ${VALID.DATABASE_URL} \r`,
      PAYLOAD_SECRET: ` ${VALID.PAYLOAD_SECRET}\r`,
    })
    expect(env).toEqual(VALID)
  })

  it('rejects a secret that is only whitespace', () => {
    expect(() => parseServerEnv({ ...VALID, PAYLOAD_SECRET: ' '.repeat(40) })).toThrowError(
      /PAYLOAD_SECRET: must be at least 32 characters/,
    )
  })

  it('never echoes the rejected values in its error', () => {
    expect(() =>
      parseServerEnv({
        DATABASE_URL: 'mongodb://user:hunter2@h/db',
        PAYLOAD_SECRET: 'short-secret',
      }),
    ).toThrowError(
      expect.objectContaining({
        message: expect.not.stringMatching(/hunter2|short-secret/),
      }),
    )
  })

  it('requires a CA certificate for a database that is not local', () => {
    expect(() =>
      parseServerEnv({
        ...VALID,
        DATABASE_URL: 'postgres://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
      }),
    ).toThrowError(/DATABASE_CA_CERT: is required for a database that is not local/)
  })

  it('accepts a remote database with a CA certificate and keeps the certificate', () => {
    const env = parseServerEnv({
      ...VALID,
      DATABASE_URL: 'postgres://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
      DATABASE_CA_CERT: `  ${CA}\n`,
    })
    expect(env.DATABASE_CA_CERT).toBe(CA)
  })

  it('does not require a CA certificate for a local database', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]']) {
      expect(() =>
        parseServerEnv({ ...VALID, DATABASE_URL: `postgres://u:p@${host}:5432/sagevani` }),
      ).not.toThrow()
    }
  })

  it('refuses sslmode in the URL, because it would override the verified TLS settings', () => {
    expect(() =>
      parseServerEnv({ ...VALID, DATABASE_URL: `${VALID.DATABASE_URL}?sslmode=require` }),
    ).toThrowError(/DATABASE_URL: must not set sslmode/)
  })
})
