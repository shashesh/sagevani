import { describe, expect, it } from 'vitest'

import { parseServerEnv } from '@/lib/env'

const VALID = {
  DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/sagevani',
  PAYLOAD_SECRET: 'a'.repeat(32),
}

const CA = '-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----'

const MEDIA = {
  MEDIA_S3_ENDPOINT: 'https://abcd.storage.supabase.co/storage/v1/s3',
  MEDIA_S3_REGION: 'us-east-2',
  MEDIA_S3_ACCESS_KEY_ID: 'access-key-id',
  MEDIA_S3_SECRET_ACCESS_KEY: 'secret-access-key',
  MEDIA_S3_BUCKET: 'media',
  MEDIA_PUBLIC_URL: 'https://abcd.supabase.co/storage/v1/object/public/media',
}

const REMOTE = {
  DATABASE_URL: 'postgres://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  DATABASE_CA_CERT: CA,
}

describe('parseServerEnv', () => {
  it('returns the variables when all are valid', () => {
    expect(parseServerEnv(VALID)).toEqual(VALID)
  })

  it('accepts the postgresql:// scheme', () => {
    const env = {
      ...VALID,
      DATABASE_URL: 'postgresql://u:p@db.example.com:6543/postgres',
      DATABASE_CA_CERT: CA,
      ...MEDIA,
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
      ...MEDIA,
    })
    expect(env.DATABASE_CA_CERT).toBe(CA)
  })

  it('converts a single-line certificate with literal backslash-n escapes to multi-line form', () => {
    const escaped = CA.replaceAll('\n', '\\n')

    const env = parseServerEnv({
      ...VALID,
      DATABASE_URL: 'postgres://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
      DATABASE_CA_CERT: escaped,
      ...MEDIA,
    })

    expect(escaped).not.toContain('\n')
    expect(env.DATABASE_CA_CERT).toBe(CA)
  })

  it('treats an empty or whitespace-only certificate as absent for a local database', () => {
    for (const value of ['', '  \r\n ']) {
      const env = parseServerEnv({ ...VALID, DATABASE_CA_CERT: value })

      expect(env).toEqual(VALID)
    }
  })

  it('still requires a certificate for a remote database when the value is empty', () => {
    for (const value of ['', '  \r\n ']) {
      expect(() =>
        parseServerEnv({
          ...VALID,
          DATABASE_URL: 'postgres://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
          DATABASE_CA_CERT: value,
        }),
      ).toThrowError(/DATABASE_CA_CERT: is required for a database that is not local/)
    }
  })

  it('rejects a certificate value that is not a PEM certificate, without echoing it', () => {
    const attempt = () => parseServerEnv({ ...VALID, DATABASE_CA_CERT: 'not-a-certificate-value' })

    expect(attempt).toThrowError(
      /DATABASE_CA_CERT: must be a PEM certificate \(from -----BEGIN CERTIFICATE----- to -----END CERTIFICATE-----\)/,
    )
    expect(attempt).toThrowError(
      expect.objectContaining({ message: expect.not.stringMatching(/not-a-certificate-value/) }),
    )
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

describe('media storage variables', () => {
  it('needs none of them for a local database', () => {
    expect(parseServerEnv(VALID).MEDIA_S3_BUCKET).toBeUndefined()
  })

  it('requires all of them for a database that is not local', () => {
    expect(() => parseServerEnv({ ...VALID, ...REMOTE })).toThrowError(
      /MEDIA_S3_ENDPOINT: is required for a database that is not local[\s\S]*MEDIA_PUBLIC_URL: is required for a database that is not local/,
    )
  })

  it('accepts a remote database with all of them', () => {
    const env = parseServerEnv({ ...VALID, ...REMOTE, ...MEDIA })
    expect(env.MEDIA_S3_BUCKET).toBe('media')
    expect(env.MEDIA_PUBLIC_URL).toBe(MEDIA.MEDIA_PUBLIC_URL)
  })

  it('refuses some without the others, even for a local database', () => {
    expect(() => parseServerEnv({ ...VALID, MEDIA_S3_BUCKET: 'media' })).toThrowError(
      /MEDIA_S3_ENDPOINT: must be set with the other media storage variables/,
    )
  })

  it('treats empty values as absent', () => {
    const blanks = Object.fromEntries(Object.keys(MEDIA).map((name) => [name, '  ']))
    expect(() => parseServerEnv({ ...VALID, ...blanks })).not.toThrow()
  })

  it('requires https:// URLs for the endpoint and the public URL', () => {
    expect(() =>
      parseServerEnv({ ...VALID, ...MEDIA, MEDIA_S3_ENDPOINT: 'http://abcd.supabase.co/s3' }),
    ).toThrowError(/MEDIA_S3_ENDPOINT: must be an https:\/\/ URL/)
    expect(() =>
      parseServerEnv({ ...VALID, ...MEDIA, MEDIA_PUBLIC_URL: 'abcd.supabase.co/media' }),
    ).toThrowError(/MEDIA_PUBLIC_URL: must be an https:\/\/ URL/)
  })

  it('refuses a query string or fragment on the public URL, because file names are appended', () => {
    for (const suffix of ['?x=1', '#top']) {
      expect(() =>
        parseServerEnv({
          ...VALID,
          ...MEDIA,
          MEDIA_PUBLIC_URL: `${MEDIA.MEDIA_PUBLIC_URL}${suffix}`,
        }),
      ).toThrowError(/MEDIA_PUBLIC_URL: must be an https:\/\/ URL with no \? or #/)
    }
  })

  it('drops trailing slashes from the public URL', () => {
    const env = parseServerEnv({
      ...VALID,
      ...MEDIA,
      MEDIA_PUBLIC_URL: `${MEDIA.MEDIA_PUBLIC_URL}//`,
    })
    expect(env.MEDIA_PUBLIC_URL).toBe(MEDIA.MEDIA_PUBLIC_URL)
  })

  it('never echoes the secret access key', () => {
    expect(() =>
      parseServerEnv({
        ...VALID,
        ...MEDIA,
        MEDIA_S3_ENDPOINT: 'not-a-url',
        MEDIA_S3_SECRET_ACCESS_KEY: 'hunter2-storage-secret',
      }),
    ).toThrowError(
      expect.objectContaining({ message: expect.not.stringMatching(/hunter2-storage-secret/) }),
    )
  })
})
