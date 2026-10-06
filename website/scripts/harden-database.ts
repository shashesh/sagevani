import 'dotenv/config'
import { Pool } from 'pg'

import { databasePoolConfig } from '../src/lib/database-pool'
import { DB_SCHEMA } from '../src/lib/db-schema'
import { parseServerEnv } from '../src/lib/env'
import { hardenSchema } from '../src/lib/harden-database'

// Deploys pass --require-schema so that hardening a database the migrations never reached fails loudly.
const requireSchema = process.argv.includes('--require-schema')

const pool = new Pool(databasePoolConfig(parseServerEnv(process.env)))

try {
  const hardened = await hardenSchema(pool, DB_SCHEMA)
  if (hardened) {
    console.log(`Row-level security enabled on every table in schema "${DB_SCHEMA}".`)
  } else if (requireSchema) {
    console.error(
      `Schema "${DB_SCHEMA}" does not exist, so it could not be hardened. Did the migrations run against this database?`,
    )
    process.exitCode = 1
  } else {
    console.log(`Schema "${DB_SCHEMA}" does not exist yet; nothing to harden.`)
  }
} catch (error) {
  console.error('db:harden failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await pool.end()
}
