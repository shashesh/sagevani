import { z } from 'zod'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

const isLocalDatabase = (databaseUrl: string): boolean => {
  try {
    return LOCAL_HOSTS.has(new URL(databaseUrl).hostname)
  } catch {
    return false
  }
}

const PEM_CERTIFICATE = /-----BEGIN CERTIFICATE-----[\s\S]*-----END CERTIFICATE-----/
const PEM_MESSAGE =
  'must be a PEM certificate (from -----BEGIN CERTIFICATE----- to -----END CERTIFICATE-----)'

const normaliseCaCert = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  return value.trim().replaceAll('\\n', '\n') || undefined
}

/** Media storage variables: all set, or none set (Supabase Storage, stage 2 design 5). */
export const MEDIA_STORAGE_VARIABLES = [
  'MEDIA_S3_ENDPOINT',
  'MEDIA_S3_REGION',
  'MEDIA_S3_ACCESS_KEY_ID',
  'MEDIA_S3_SECRET_ACCESS_KEY',
  'MEDIA_S3_BUCKET',
  'MEDIA_PUBLIC_URL',
] as const

// An empty or whitespace-only value counts as absent, as in .env.example.
const optionalText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value

const withoutTrailingSlashes = (value: unknown): unknown => {
  const text = optionalText(value)
  return typeof text === 'string' ? text.replace(/\/+$/, '') : text
}

const HTTPS_URL = z.string().regex(/^https:\/\/[^\s/]+(\/\S*)?$/, 'must be an https:// URL')

// File names are appended to the public URL, so it can't carry a query string or fragment.
const PUBLIC_URL = z
  .string()
  .regex(/^https:\/\/[^\s/?#]+(\/[^\s?#]*)?$/, 'must be an https:// URL with no ? or #')

const serverEnvSchema = z
  .object({
    DATABASE_URL: z
      .string({ error: 'is required' })
      .trim()
      .regex(/^postgres(ql)?:\/\/.+/, 'must be a postgres:// connection string'),
    PAYLOAD_SECRET: z
      .string({ error: 'is required' })
      .trim()
      .min(32, 'must be at least 32 characters'),
    // PEM certificate of the database's certificate authority. Supabase's certificates chain to its
    // own CA, which is not in Node's trust store (Project Settings → Database → SSL Configuration).
    // Accepts the multi-line PEM or one line with literal \n escapes, because Netlify's UI is
    // unreliable with multi-line values. An empty value counts as absent, as in .env.example.
    DATABASE_CA_CERT: z.preprocess(
      normaliseCaCert,
      z.string().regex(PEM_CERTIFICATE, PEM_MESSAGE).optional(),
    ),
    MEDIA_S3_ENDPOINT: z.preprocess(optionalText, HTTPS_URL.optional()),
    MEDIA_S3_REGION: z.preprocess(optionalText, z.string().optional()),
    MEDIA_S3_ACCESS_KEY_ID: z.preprocess(optionalText, z.string().optional()),
    MEDIA_S3_SECRET_ACCESS_KEY: z.preprocess(optionalText, z.string().optional()),
    MEDIA_S3_BUCKET: z.preprocess(optionalText, z.string().optional()),
    MEDIA_PUBLIC_URL: z.preprocess(withoutTrailingSlashes, PUBLIC_URL.optional()),
  })
  .superRefine((env, ctx) => {
    if (typeof env.DATABASE_URL !== 'string') return
    if (/[?&]sslmode=/i.test(env.DATABASE_URL)) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'must not set sslmode; TLS is configured in code from DATABASE_CA_CERT',
      })
    }
    if (!isLocalDatabase(env.DATABASE_URL) && !env.DATABASE_CA_CERT) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_CA_CERT'],
        message: 'is required for a database that is not local',
      })
    }
    // Netlify functions have no lasting disk, so a deployed site must store media in Supabase.
    const present = MEDIA_STORAGE_VARIABLES.filter((name) => env[name] !== undefined)
    if (present.length > 0 || !isLocalDatabase(env.DATABASE_URL)) {
      for (const name of MEDIA_STORAGE_VARIABLES) {
        if (env[name] !== undefined) continue
        ctx.addIssue({
          code: 'custom',
          path: [name],
          message:
            present.length > 0
              ? 'must be set with the other media storage variables'
              : 'is required for a database that is not local',
        })
      }
    }
  })

export type ServerEnv = z.infer<typeof serverEnvSchema>

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source)
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid or missing environment variables:\n${problems}`)
  }
  return result.data
}
