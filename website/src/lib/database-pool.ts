import type { PoolConfig } from 'pg'

import type { ServerEnv } from './env'

const CONNECTION_TIMEOUT_MS = 10_000

// One connection setup for Payload, the command-line tools and tests. Remote databases are reached
// over TLS and fully verified against the supplied CA; local databases use plain connections.
export function databasePoolConfig({
  DATABASE_URL,
  DATABASE_CA_CERT,
}: Pick<ServerEnv, 'DATABASE_URL' | 'DATABASE_CA_CERT'>): PoolConfig {
  const base = { connectionString: DATABASE_URL, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS }
  if (!DATABASE_CA_CERT) return base
  return { ...base, ssl: { ca: DATABASE_CA_CERT, rejectUnauthorized: true } }
}
