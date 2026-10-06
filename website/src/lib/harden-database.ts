import type { Pool } from 'pg'

// Supabase publishes a web API (PostgREST) for exposed schemas and grants its `anon` and
// `authenticated` roles access. Payload's tables must never be reachable that way, so we
// enable row-level security on every table in the schema (no policies = no rows for those
// roles) and revoke their privileges. Payload connects as the table owner, which RLS does
// not restrict. Roles that do not exist (e.g. plain local Postgres) are skipped.
// Returns false, and changes nothing, when the schema does not exist yet (e.g. before the first migration).
const API_ROLES = ['anon', 'authenticated'] as const

export async function hardenSchema(pool: Pool, schema: string): Promise<boolean> {
  const { rowCount } = await pool.query('SELECT 1 FROM pg_namespace WHERE nspname = $1', [schema])
  if (!rowCount) return false

  const { rows } = await pool.query<{ tablename: string }>(
    'SELECT tablename FROM pg_tables WHERE schemaname = $1',
    [schema],
  )
  for (const { tablename } of rows) {
    await pool.query(`ALTER TABLE "${schema}"."${tablename}" ENABLE ROW LEVEL SECURITY`)
  }

  const { rows: roles } = await pool.query<{ rolname: string }>(
    'SELECT rolname FROM pg_roles WHERE rolname = ANY($1)',
    [API_ROLES],
  )
  for (const { rolname } of roles) {
    await pool.query(`REVOKE ALL ON SCHEMA "${schema}" FROM "${rolname}"`)
    await pool.query(`REVOKE ALL ON ALL TABLES IN SCHEMA "${schema}" FROM "${rolname}"`)
    await pool.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA "${schema}" FROM "${rolname}"`)
  }
  return true
}
