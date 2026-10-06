import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { allowOwnerChange } from '@/collections/Users'
import config from '@/payload.config'
import { createOwner } from '@/lib/create-owner'

let payload: Payload

const clearUsers = () =>
  payload.delete({
    collection: 'users',
    where: { id: { exists: true } },
    overrideAccess: true,
    context: allowOwnerChange(),
  })

describe('createOwner', () => {
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

  it('creates the owner on an empty database', async () => {
    const owner = await createOwner(payload, {
      email: 'owner@example.com',
      name: 'Owner',
      password: 'long-enough-password',
    })
    expect(owner.role).toBe('owner')
  })

  it('refuses when any account already exists', async () => {
    await createOwner(payload, {
      email: 'owner@example.com',
      name: 'Owner',
      password: 'long-enough-password',
    })
    await expect(
      createOwner(payload, {
        email: 'second@example.com',
        name: 'Second',
        password: 'long-enough-password',
      }),
    ).rejects.toThrow('Refusing to create an owner: this database already has user accounts.')
  })

  it('still works in production, where first sign-ups are refused', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const owner = await createOwner(payload, {
        email: 'owner@example.com',
        name: 'Owner',
        password: 'long-enough-password',
      })
      expect(owner.role).toBe('owner')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('refuses a password shorter than 12 characters', async () => {
    await expect(
      createOwner(payload, { email: 'owner@example.com', name: 'Owner', password: 'short' }),
    ).rejects.toThrow('The owner password must be at least 12 characters.')
  })
})
