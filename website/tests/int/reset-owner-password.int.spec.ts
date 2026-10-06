import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { allowOwnerChange } from '@/collections/Users'
import { createOwner } from '@/lib/create-owner'
import { resetOwnerPassword } from '@/lib/reset-owner-password'
import config from '@/payload.config'

const EMAIL = 'owner@example.com'
const OLD_PASSWORD = 'long-enough-password'
const NEW_PASSWORD = 'a-brand-new-passphrase'

let payload: Payload

const clearUsers = () =>
  payload.delete({
    collection: 'users',
    where: { id: { exists: true } },
    overrideAccess: true,
    context: allowOwnerChange(),
  })

const login = (password: string) =>
  payload.login({ collection: 'users', data: { email: EMAIL, password } })

const createTestOwner = () =>
  createOwner(payload, { email: EMAIL, name: 'Owner', password: OLD_PASSWORD })

describe('resetOwnerPassword', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearUsers()
  })

  afterAll(async () => {
    await clearUsers()
    await payload.destroy()
  })

  it('accepts the new password and rejects the old one', async () => {
    await createTestOwner()

    const result = await resetOwnerPassword(payload, NEW_PASSWORD)

    expect(result).toEqual({ email: EMAIL })
    await expect(login(NEW_PASSWORD)).resolves.toMatchObject({ token: expect.any(String) })
    await expect(login(OLD_PASSWORD)).rejects.toThrow()
  })

  it('signs out existing sessions', async () => {
    await createTestOwner()
    const { token } = await login(OLD_PASSWORD)
    const headers = new Headers({ Authorization: `JWT ${token}` })
    expect((await payload.auth({ headers })).user).not.toBeNull()

    await resetOwnerPassword(payload, NEW_PASSWORD)

    expect((await payload.auth({ headers })).user).toBeNull()
  })

  it('clears a login lock', async () => {
    await createTestOwner()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login('wrong-password-attempt').catch(() => undefined)
    }
    await expect(login(OLD_PASSWORD)).rejects.toThrow()

    await resetOwnerPassword(payload, NEW_PASSWORD)

    await expect(login(NEW_PASSWORD)).resolves.toMatchObject({ token: expect.any(String) })
  })

  it('refuses a password that is too short and keeps the old one', async () => {
    await createTestOwner()

    await expect(resetOwnerPassword(payload, 'short-pass')).rejects.toThrow(
      'The owner password must be at least 12 characters.',
    )

    await expect(login(OLD_PASSWORD)).resolves.toMatchObject({ token: expect.any(String) })
  })

  it('refuses a password based on the owner name and keeps the old one', async () => {
    await createTestOwner()

    await expect(resetOwnerPassword(payload, 'owner-is-me-2026-x')).rejects.toThrow(
      'Choose an owner password that is not a repeated character or based on your email or name.',
    )

    await expect(login(OLD_PASSWORD)).resolves.toMatchObject({ token: expect.any(String) })
  })

  it('refuses when no owner exists', async () => {
    await expect(resetOwnerPassword(payload, NEW_PASSWORD)).rejects.toThrow(
      'No owner account exists in this database. Create one with owner:create.',
    )
  })

  it('leaves the owner role and email unchanged', async () => {
    await createTestOwner()

    await resetOwnerPassword(payload, NEW_PASSWORD)

    const { docs } = await payload.find({
      collection: 'users',
      limit: 5,
      depth: 0,
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({ email: EMAIL, role: 'owner', name: 'Owner' })
  })
})
