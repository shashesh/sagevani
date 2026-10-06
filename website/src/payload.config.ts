import { postgresAdapter } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres/drizzle'
import { uniqueIndex } from '@payloadcms/db-postgres/drizzle/pg-core'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { DB_SCHEMA } from './lib/db-schema'
import { parseServerEnv } from './lib/env'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const env = parseServerEnv(process.env)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users],
  editor: lexicalEditor(),
  secret: env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URL,
    },
    schemaName: DB_SCHEMA,
    migrationDir: path.resolve(dirname, 'migrations'),
    // The database itself guarantees a single owner, even if first sign-ups race.
    afterSchemaInit: [
      ({ schema, extendTable }) => {
        extendTable({
          table: schema.tables.users,
          extraConfig: (t) => ({
            singleOwner: uniqueIndex('users_single_owner_idx').on(t.role).where(sql`"role" = 'owner'`),
          }),
        })
        return schema
      },
    ],
  }),
  sharp,
  plugins: [],
})
