import { postgresAdapter } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres/drizzle'
import { uniqueIndex } from '@payloadcms/db-postgres/drizzle/pg-core'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { s3Storage } from '@payloadcms/storage-s3'

import { DifficultyLevels } from './collections/DifficultyLevels'
import { MAX_UPLOAD_BYTES, Media } from './collections/Media'
import { Topics } from './collections/Topics'
import { Users } from './collections/Users'
import { databasePoolConfig } from './lib/database-pool'
import { DB_SCHEMA } from './lib/db-schema'
import { parseServerEnv } from './lib/env'
import { mediaStoragePlugin, mediaStorageSettings } from './lib/media-storage'

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
  collections: [Users, Topics, DifficultyLevels, Media],
  editor: lexicalEditor(),
  upload: { limits: { fileSize: MAX_UPLOAD_BYTES } },
  // The site only uses the REST and Local APIs; GraphQL would add query-depth, introspection and
  // playground surface for no benefit.
  graphQL: { disable: true },
  secret: env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: databasePoolConfig(env),
    schemaName: DB_SCHEMA,
    migrationDir: path.resolve(dirname, 'migrations'),
    // The database itself guarantees a single owner, even if first sign-ups race.
    afterSchemaInit: [
      ({ schema, extendTable }) => {
        extendTable({
          table: schema.tables.users,
          extraConfig: (t) => ({
            singleOwner: uniqueIndex('users_single_owner_idx')
              .on(t.role)
              .where(sql`"role" = 'owner'`),
          }),
        })
        return schema
      },
    ],
  }),
  sharp,
  plugins: [s3Storage(mediaStoragePlugin(mediaStorageSettings(env)))],
})
