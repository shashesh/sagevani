import { z } from 'zod'

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string({ error: 'is required' })
    .trim()
    .regex(/^postgres(ql)?:\/\/.+/, 'must be a postgres:// connection string'),
  PAYLOAD_SECRET: z
    .string({ error: 'is required' })
    .trim()
    .min(32, 'must be at least 32 characters'),
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
