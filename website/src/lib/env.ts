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
