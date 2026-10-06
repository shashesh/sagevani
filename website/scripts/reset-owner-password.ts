import 'dotenv/config'
import { getPayload, type Payload } from 'payload'

import { describeError } from '../src/lib/describe-error'
import { resetOwnerPassword } from '../src/lib/reset-owner-password'

async function main(): Promise<number> {
  const { OWNER_PASSWORD } = process.env
  if (!OWNER_PASSWORD) {
    console.error('Set OWNER_PASSWORD to the new owner password for this command.')
    return 1
  }

  let payload: Payload | undefined
  try {
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })
    const owner = await resetOwnerPassword(payload, OWNER_PASSWORD)
    console.log(
      `Password reset for ${owner.email}. Every session was signed out, any API key was removed, and any login lock was cleared.`,
    )
    return 0
  } catch (error) {
    console.error(
      `Could not reset the owner password: ${describeError(error, [process.env.DATABASE_URL, process.env.OWNER_PASSWORD])}`,
    )
    return 1
  } finally {
    await payload?.destroy().catch(() => undefined)
  }
}

// Payload keeps background handles open after destroy(); exit explicitly so the command ends.
process.exit(await main())
