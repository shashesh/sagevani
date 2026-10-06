import type { Pool, PoolClient } from 'pg'

// Supabase publishes a web API (PostgREST) for exposed schemas and grants its `anon` and
// `authenticated` roles access. Payload's tables must never be reachable that way. Revoking the
// roles' privileges (schema USAGE first) is the primary lock; row-level security with no policies
// is the backstop. Payload connects as the table owner, which RLS (without FORCE) does not
// restrict. Roles that do not exist (e.g. plain local Postgres) are skipped.
// Everything runs in one transaction, so a failure leaves the schema exactly as it was.
// Returns false, and changes nothing, when the schema does not exist yet (e.g. before the first migration).
const API_ROLES = ['anon', 'authenticated'] as const
const OBJECT_KINDS = ['TABLES', 'SEQUENCES', 'FUNCTIONS'] as const

const ident = (name: string): string => `"${name.replaceAll('"', '""')}"`

export async function hardenSchema(pool: Pool, schema: string): Promise<boolean> {
  const client = await pool.connect()
  let brokenConnection: Error | undefined
  try {
    await client.query('BEGIN')
    const hardened = await hardenInTransaction(client, schema)
    await client.query('COMMIT')
    return hardened
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError: Error) => {
      brokenConnection = rollbackError
    })
    throw error
  } finally {
    // A connection whose rollback failed is discarded instead of being returned to the pool.
    client.release(brokenConnection)
  }
}

async function hardenInTransaction(client: PoolClient, schema: string): Promise<boolean> {
  await client.query("SET LOCAL lock_timeout = '10s'")
  const { rowCount } = await client.query('SELECT 1 FROM pg_namespace WHERE nspname = $1', [schema])
  if (!rowCount) return false

  const { rows: roles } = await client.query<{ rolname: string }>(
    'SELECT rolname FROM pg_roles WHERE rolname = ANY($1)',
    [API_ROLES],
  )
  for (const { rolname } of roles) {
    const role = ident(rolname)
    await client.query(`REVOKE ALL ON SCHEMA ${ident(schema)} FROM ${role}`)
    for (const kind of OBJECT_KINDS) {
      await client.query(`REVOKE ALL ON ALL ${kind} IN SCHEMA ${ident(schema)} FROM ${role}`)
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA ${ident(schema)} REVOKE ALL ON ${kind} FROM ${role}`,
      )
    }
  }

  const { rows: tables } = await client.query<{ tablename: string }>(
    'SELECT tablename FROM pg_tables WHERE schemaname = $1',
    [schema],
  )
  for (const { tablename } of tables) {
    await client.query(`ALTER TABLE ${ident(schema)}.${ident(tablename)} ENABLE ROW LEVEL SECURITY`)
  }
  return true
}
