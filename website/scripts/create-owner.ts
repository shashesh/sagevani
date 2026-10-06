import 'dotenv/config'
import { getPayload, type Payload } from 'payload'

import { createOwner } from '../src/lib/create-owner'
import { describeError } from '../src/lib/describe-error'

async function main(): Promise<number> {
  const { OWNER_EMAIL, OWNER_NAME, OWNER_PASSWORD } = process.env
  if (!OWNER_EMAIL || !OWNER_NAME || !OWNER_PASSWORD) {
    console.error('Set OWNER_EMAIL, OWNER_NAME and OWNER_PASSWORD for this command.')
    return 1
  }

  let payload: Payload | undefined
  try {
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })
    const owner = await createOwner(payload, {
      email: OWNER_EMAIL,
      name: OWNER_NAME,
      password: OWNER_PASSWORD,
    })
    console.log(`Owner account created for ${owner.email}.`)
    return 0
  } catch (error) {
    console.error(
      `Could not create the owner: ${describeError(error, [process.env.DATABASE_URL, process.env.OWNER_PASSWORD])}`,
    )
    return 1
  } finally {
    await payload?.destroy().catch(() => undefined)
  }
}

// Payload keeps background handles open after destroy(); exit explicitly so the command ends.
process.exit(await main())
