import type { Payload } from 'payload'

import { USERS_SLUG } from '../access/roles'
import { checkOwnerPassword } from './create-owner'

// Recovery path for the owner, run from the owner's machine: sets a new password on the single
// owner account, which signs out every existing session, and clears any login lock.
export async function resetOwnerPassword(
  payload: Payload,
  password: string,
): Promise<{ email: string }> {
  const { docs } = await payload.find({
    collection: USERS_SLUG,
    where: { role: { equals: 'owner' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const owner = docs[0]
  if (!owner) {
    throw new Error('No owner account exists in this database. Create one with owner:create.')
  }
  checkOwnerPassword({ email: owner.email, name: owner.name, password })

  // Setting a password with no signed-in user also empties the owner's sessions; the API key is
  // removed too, so a leaked key cannot outlive the recovery.
  await payload.update({
    collection: USERS_SLUG,
    id: owner.id,
    data: { password, enableAPIKey: false, apiKey: null },
    overrideAccess: true,
  })
  // Unlocking looks the account up by email only; the generated type also asks for a password, so pass an empty one.
  await payload.unlock({
    collection: USERS_SLUG,
    data: { email: owner.email, password: '' },
    overrideAccess: true,
  })
  return { email: owner.email }
}
