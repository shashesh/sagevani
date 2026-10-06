import { Pool } from 'pg'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { DB_SCHEMA } from '@/lib/db-schema'
import { parseServerEnv } from '@/lib/env'
import config from '@/payload.config'

let payload: Payload | undefined
let pool: Pool | undefined

const db = (): Pool => {
  if (!pool) throw new Error('The database pool was not created.')
  return pool
}

describe('database layout', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    pool = new Pool({ connectionString: parseServerEnv(process.env).DATABASE_URL })
  })

  afterAll(async () => {
    await pool?.end()
    await payload?.destroy()
  })

  // Covers the schema Payload pushes in development. The migration path is checked separately
  // (Task 9) by migrating a fresh database.
  it('keeps every Payload table, sequence, view and enum in the dedicated schema, none in public', async () => {
    const { rows: tables } = await db().query<{ tablename: string }>(
      'SELECT tablename FROM pg_tables WHERE schemaname = $1',
      [DB_SCHEMA],
    )
    expect(tables.map((t) => t.tablename)).toEqual(
      expect.arrayContaining(['users', 'payload_migrations', 'payload_preferences', 'payload_kv']),
    )

    const { rows: inPublic } = await db().query<{ name: string; kind: string }>(
      `SELECT c.relname AS name, c.relkind::text AS kind
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'S', 'v', 'm')
       UNION ALL
       SELECT t.typname AS name, 'enum' AS kind
         FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public' AND t.typtype = 'e'`,
    )
    expect(inPublic).toEqual([])
  })
})
