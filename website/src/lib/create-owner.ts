import type { Payload } from 'payload'

import { USERS_SLUG } from '../access/roles'
import { allowOwnerChange } from '../collections/Users'

export const MIN_OWNER_PASSWORD_LENGTH = 12
const MIN_IDENTIFIER_LENGTH = 4

export type OwnerInput = { email: string; name: string; password: string }

// Rejects passwords that are short (counted in characters, not UTF-16 units), one repeated
// character, or built from the owner's email name or display name.
export function checkOwnerPassword({ email, name, password }: OwnerInput): void {
  if ([...password].length < MIN_OWNER_PASSWORD_LENGTH) {
    throw new Error(`The owner password must be at least ${MIN_OWNER_PASSWORD_LENGTH} characters.`)
  }
  const lower = password.toLowerCase()
  const identifiers = [email.split('@')[0], name].map((part) => part.trim().toLowerCase())
  const basedOnIdentity = identifiers.some(
    (part) => part.length >= MIN_IDENTIFIER_LENGTH && lower.includes(part),
  )
  if (/^(.)\1+$/u.test(password) || basedOnIdentity) {
    throw new Error(
      'Choose an owner password that is not a repeated character or based on your email or name.',
    )
  }
}

// Creates the single owner account on a fresh database, before the site is reachable. Outside
// development and tests the Users collection refuses first sign-ups, so this deliberate server-side
// path carries the owner-maintenance flag. The flag also skips the single-owner hook, so the
// database's unique index is what prevents a second owner here. It creates one document; never
// bulk-write with the flag.
export async function createOwner(payload: Payload, input: OwnerInput) {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  if (!name) throw new Error('The owner name must not be empty.')
  checkOwnerPassword({ email, name, password: input.password })

  const { totalDocs } = await payload.count({ collection: USERS_SLUG, overrideAccess: true })
  if (totalDocs > 0) {
    throw new Error('Refusing to create an owner: this database already has user accounts.')
  }
  return payload.create({
    collection: USERS_SLUG,
    data: { email, name, password: input.password, role: 'owner' },
    overrideAccess: true,
    context: allowOwnerChange(),
  })
}
