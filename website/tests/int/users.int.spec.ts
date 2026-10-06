import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ALLOW_OWNER_CHANGE } from '@/collections/Users'
import config from '@/payload.config'

let payload: Payload

const password = 'correct-horse-battery-staple'

const clearUsers = () =>
  payload.delete({
    collection: 'users',
    where: { id: { exists: true } },
    overrideAccess: true,
    context: { [ALLOW_OWNER_CHANGE]: true },
  })

const createOwner = () =>
  payload.create({
    collection: 'users',
    data: { email: 'owner@example.com', name: 'Owner', password, role: 'owner' },
    overrideAccess: true,
  })

const createAssistant = () =>
  payload.create({
    collection: 'users',
    data: { email: 'assistant@example.com', name: 'Assistant', password, role: 'assistant' },
    overrideAccess: true,
  })

describe('users and roles', () => {
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

  it('makes the first account the owner, whatever role was requested', async () => {
    const first = await payload.create({
      collection: 'users',
      data: { email: 'first@example.com', name: 'First', password, role: 'assistant' },
      overrideAccess: false,
    })
    expect(first.role).toBe('owner')
  })

  it('refuses anonymous sign-ups once an account exists', async () => {
    await createOwner()
    await expect(
      payload.create({
        collection: 'users',
        data: { email: 'stranger@example.com', name: 'Stranger', password, role: 'owner' },
        overrideAccess: false,
      }),
    ).rejects.toThrow(/not allowed/i)
  })

  it('lets the owner create an assistant', async () => {
    const owner = await createOwner()
    const assistant = await payload.create({
      collection: 'users',
      data: { email: 'assistant@example.com', name: 'Assistant', password, role: 'assistant' },
      overrideAccess: false,
      user: owner,
    })
    expect(assistant.role).toBe('assistant')
  })

  it('does not let an assistant promote themselves', async () => {
    await createOwner()
    const assistant = await createAssistant()
    const updated = await payload.update({
      collection: 'users',
      id: assistant.id,
      data: { role: 'owner' },
      overrideAccess: false,
      user: assistant,
    })
    expect(updated.role).toBe('assistant')
  })

  it('shows an assistant only their own account', async () => {
    await createOwner()
    const assistant = await createAssistant()
    const visible = await payload.find({
      collection: 'users',
      overrideAccess: false,
      user: assistant,
    })
    expect(visible.docs.map((u) => u.email)).toEqual(['assistant@example.com'])
  })

  it('does not let an assistant delete accounts', async () => {
    const owner = await createOwner()
    const assistant = await createAssistant()
    await expect(
      payload.delete({ collection: 'users', id: owner.id, overrideAccess: false, user: assistant }),
    ).rejects.toThrow(/not allowed/i)
  })

  it('does not let an assistant unlock the owner', async () => {
    await createOwner()
    const assistant = await createAssistant()
    await expect(
      payload.unlock({
        collection: 'users',
        // The generated auth types require a password here, although unlock does not use it.
        data: { email: 'owner@example.com', password: '' },
        overrideAccess: false,
        req: { user: { ...assistant, collection: 'users' } },
      }),
    ).rejects.toThrow(/not allowed/i)
  })

  it('refuses a second owner account', async () => {
    const owner = await createOwner()
    await expect(
      payload.create({
        collection: 'users',
        data: { email: 'second@example.com', name: 'Second', password, role: 'owner' },
        overrideAccess: false,
        user: owner,
      }),
    ).rejects.toThrow('There can only be one owner account.')
  })

  it('refuses to demote the owner', async () => {
    const owner = await createOwner()
    await expect(
      payload.update({
        collection: 'users',
        id: owner.id,
        data: { role: 'assistant' },
        overrideAccess: false,
        user: owner,
      }),
    ).rejects.toThrow('The owner account cannot be demoted.')
  })

  it('refuses to delete the owner', async () => {
    const owner = await createOwner()
    await expect(
      payload.delete({ collection: 'users', id: owner.id, overrideAccess: false, user: owner }),
    ).rejects.toThrow('The owner account cannot be deleted.')
  })

  it('ignores a plain string flag, which an outside request could send', async () => {
    const owner = await createOwner()
    await expect(
      payload.delete({
        collection: 'users',
        id: owner.id,
        overrideAccess: false,
        user: owner,
        context: { allowOwnerChange: true },
      }),
    ).rejects.toThrow('The owner account cannot be deleted.')
  })

  it('still lets the owner edit their own details', async () => {
    const owner = await createOwner()
    const updated = await payload.update({
      collection: 'users',
      id: owner.id,
      data: { name: 'Renamed' },
      overrideAccess: false,
      user: owner,
    })
    expect(updated).toMatchObject({ name: 'Renamed', role: 'owner' })
  })

  it('locks login after five failed attempts', async () => {
    await createOwner()
    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(
        payload.login({
          collection: 'users',
          data: { email: 'owner@example.com', password: 'wrong' },
        }),
      ).rejects.toThrow()
    }
    await expect(
      payload.login({ collection: 'users', data: { email: 'owner@example.com', password } }),
    ).rejects.toThrow(/locked/i)
  })
})
