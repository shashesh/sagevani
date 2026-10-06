import type { Payload } from 'payload'

import { allowOwnerChange } from '../collections/Users'

export const MIN_OWNER_PASSWORD_LENGTH = 12

export type OwnerInput = { email: string; name: string; password: string }

// Creates the single owner account on a fresh database, before the site is reachable. Outside
// development and tests the Users collection refuses first sign-ups, so this deliberate server-side
// path carries the owner-maintenance flag. It creates one document; never bulk-write with the flag.
export async function createOwner(payload: Payload, input: OwnerInput) {
  if (input.password.length < MIN_OWNER_PASSWORD_LENGTH) {
    throw new Error(`The owner password must be at least ${MIN_OWNER_PASSWORD_LENGTH} characters.`)
  }
  const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
  if (totalDocs > 0) {
    throw new Error('Refusing to create an owner: this database already has user accounts.')
  }
  return payload.create({
    collection: 'users',
    data: { ...input, role: 'owner' },
    overrideAccess: true,
    context: allowOwnerChange(),
  })
}
