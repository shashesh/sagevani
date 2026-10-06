import 'dotenv/config'
import { Pool } from 'pg'

import { DB_SCHEMA } from '../src/lib/db-schema'
import { parseServerEnv } from '../src/lib/env'
import { hardenSchema } from '../src/lib/harden-database'

const { DATABASE_URL } = parseServerEnv(process.env)
const pool = new Pool({ connectionString: DATABASE_URL })

try {
  const hardened = await hardenSchema(pool, DB_SCHEMA)
  console.log(
    hardened
      ? `Row-level security enabled on every table in schema "${DB_SCHEMA}".`
      : `Schema "${DB_SCHEMA}" does not exist yet; nothing to harden.`,
  )
} finally {
  await pool.end()
}
