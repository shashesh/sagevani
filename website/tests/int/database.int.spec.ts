import { Pool } from 'pg'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { allowOwnerChange } from '@/collections/Users'
import { databasePoolConfig } from '@/lib/database-pool'
import { DB_SCHEMA } from '@/lib/db-schema'
import { parseServerEnv } from '@/lib/env'
import { hardenSchema } from '@/lib/harden-database'
import config from '@/payload.config'

let payload: Payload | undefined
let pool: Pool | undefined

const db = (): Pool => {
  if (!pool) throw new Error('The database pool was not created.')
  return pool
}

const cms = (): Payload => {
  if (!payload) throw new Error('Payload was not initialised.')
  return payload
}

// Supabase always has these roles; plain local Postgres does not, so tests create them.
const ensureApiRoles = async () => {
  for (const role of ['anon', 'authenticated']) {
    await db().query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
           CREATE ROLE ${role} NOLOGIN;
         END IF;
       END $$`,
    )
  }
}

describe('database layout', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    pool = new Pool(databasePoolConfig(parseServerEnv(process.env)))
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

  it('enables row-level security on every table after hardening', async () => {
    await hardenSchema(db(), DB_SCHEMA)
    const { rows } = await db().query<{ relname: string; relrowsecurity: boolean }>(
      `SELECT c.relname, c.relrowsecurity
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relkind = 'r'`,
      [DB_SCHEMA],
    )
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.filter((r) => !r.relrowsecurity)).toEqual([])
  })

  it("revokes Supabase's API roles from the schema when they exist", async () => {
    await ensureApiRoles()
    for (const role of ['anon', 'authenticated']) {
      await db().query(`GRANT USAGE ON SCHEMA "${DB_SCHEMA}" TO ${role}`)
      await db().query(`GRANT SELECT ON ALL TABLES IN SCHEMA "${DB_SCHEMA}" TO ${role}`)
    }

    await hardenSchema(db(), DB_SCHEMA)

    const { rows } = await db().query<{ rolname: string; usage: boolean; can_select: boolean }>(
      `SELECT rolname,
              has_schema_privilege(rolname, $1, 'USAGE') AS usage,
              has_table_privilege(rolname, $2, 'SELECT') AS can_select
         FROM pg_roles WHERE rolname IN ('anon', 'authenticated')`,
      [DB_SCHEMA, `${DB_SCHEMA}.users`],
    )
    expect(rows).toHaveLength(2)
    expect(rows.filter((r) => r.usage || r.can_select)).toEqual([])
  })

  it('does nothing, and does not fail, when the schema does not exist yet', async () => {
    await expect(hardenSchema(db(), 'payload_schema_that_does_not_exist')).resolves.toBe(false)
  })

  it('can run again, and covers tables created after an earlier hardening', async () => {
    await hardenSchema(db(), DB_SCHEMA)
    await db().query(`CREATE TABLE "${DB_SCHEMA}".hardening_check (id int)`)
    try {
      await expect(hardenSchema(db(), DB_SCHEMA)).resolves.toBe(true)
      const { rows } = await db().query<{ relrowsecurity: boolean }>(
        `SELECT c.relrowsecurity
           FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = $1 AND c.relname = 'hardening_check'`,
        [DB_SCHEMA],
      )
      expect(rows).toEqual([{ relrowsecurity: true }])
    } finally {
      await db().query(`DROP TABLE "${DB_SCHEMA}".hardening_check`)
    }
  })

  it('removes default privileges that would grant the API roles access to future objects', async () => {
    await ensureApiRoles()
    await db().query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA "${DB_SCHEMA}" GRANT SELECT ON TABLES TO anon`,
    )
    await db().query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA "${DB_SCHEMA}" GRANT USAGE ON SEQUENCES TO authenticated`,
    )

    await hardenSchema(db(), DB_SCHEMA)

    const { rows } = await db().query<{ acl: string }>(
      `SELECT array_to_string(d.defaclacl, ',') AS acl
         FROM pg_default_acl d JOIN pg_namespace n ON n.oid = d.defaclnamespace
        WHERE n.nspname = $1`,
      [DB_SCHEMA],
    )
    expect(rows.filter((r) => /(^|,)(anon|authenticated)=/.test(r.acl))).toEqual([])
  })

  it('still lets Payload read and write after hardening', async () => {
    await hardenSchema(db(), DB_SCHEMA)
    const created = await cms().create({
      collection: 'users',
      data: {
        email: 'after-rls@example.com',
        name: 'After',
        password: 'correct-horse-battery-staple',
        role: 'assistant',
      },
      overrideAccess: true,
    })
    try {
      const found = await cms().findByID({
        collection: 'users',
        id: created.id,
        overrideAccess: true,
      })
      expect(found.email).toBe('after-rls@example.com')
    } finally {
      // On an empty database this user becomes the owner, which may only be removed deliberately.
      await cms().delete({
        collection: 'users',
        id: created.id,
        overrideAccess: true,
        context: allowOwnerChange(),
      })
    }
  })
})
