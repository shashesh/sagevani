import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { createOwner } from '../src/lib/create-owner'

const { OWNER_EMAIL, OWNER_NAME, OWNER_PASSWORD } = process.env
if (!OWNER_EMAIL || !OWNER_NAME || !OWNER_PASSWORD) {
  console.error('Set OWNER_EMAIL, OWNER_NAME and OWNER_PASSWORD for this command.')
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  const owner = await createOwner(payload, {
    email: OWNER_EMAIL,
    name: OWNER_NAME,
    password: OWNER_PASSWORD,
  })
  console.log(`Owner account created for ${owner.email}.`)
  process.exitCode = 0
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await payload.destroy()
  // Payload keeps background handles open after destroy(); exit explicitly so the command ends.
  process.exit()
}
