import { Pool } from 'pg'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { DB_SCHEMA } from '@/lib/db-schema'

let payload: Payload
let pool: Pool

describe('database layout', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  })

  afterAll(async () => {
    await pool.end()
    await payload.destroy()
  })

  it('keeps every Payload table in the dedicated schema, none in public', async () => {
    const { rows } = await pool.query<{ schemaname: string; tablename: string }>(
      `SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('public', $1)`,
      [DB_SCHEMA],
    )
    const inSchema = rows.filter((r) => r.schemaname === DB_SCHEMA).map((r) => r.tablename)
    const inPublic = rows.filter((r) => r.schemaname === 'public').map((r) => r.tablename)

    expect(inSchema).toContain('users')
    expect(inPublic).toEqual([])
  })
})
