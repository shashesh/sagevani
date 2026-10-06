import { describe, expect, it } from 'vitest'

import { databasePoolConfig } from '@/lib/database-pool'

const CA = '-----BEGIN CERTIFICATE-----\nMIIBfake\n-----END CERTIFICATE-----'

describe('databasePoolConfig', () => {
  it('connects to a local database without TLS', () => {
    expect(databasePoolConfig({ DATABASE_URL: 'postgres://u:p@127.0.0.1:54329/sagevani' })).toEqual(
      {
        connectionString: 'postgres://u:p@127.0.0.1:54329/sagevani',
        connectionTimeoutMillis: 10_000,
      },
    )
  })

  it('verifies the server against the supplied CA when one is set', () => {
    expect(
      databasePoolConfig({
        DATABASE_URL: 'postgres://u:p@db.example.com:5432/postgres',
        DATABASE_CA_CERT: CA,
      }),
    ).toEqual({
      connectionString: 'postgres://u:p@db.example.com:5432/postgres',
      connectionTimeoutMillis: 10_000,
      ssl: { ca: CA, rejectUnauthorized: true },
    })
  })
})
