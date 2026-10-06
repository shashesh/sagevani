import { createLocalReq, getAccessResults, getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { allowOwnerChange } from '@/collections/Users'
import config from '@/payload.config'
import type { User } from '@/payload-types'

let payload: Payload

const password = 'correct-horse-battery-staple'

const clearUsers = () =>
  payload.delete({
    collection: 'users',
    where: { id: { exists: true } },
    overrideAccess: true,
    context: allowOwnerChange(),
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
    await expect(
      payload.update({
        collection: 'users',
        id: assistant.id,
        data: { role: 'owner' },
        overrideAccess: false,
        user: assistant,
      }),
    ).rejects.toThrow(/not allowed/i)
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

  it('ignores look-alike Symbols with the same description', async () => {
    const owner = await createOwner()
    for (const lookalike of [Symbol('allowOwnerChange'), Symbol.for('allowOwnerChange')]) {
      await expect(
        payload.delete({
          collection: 'users',
          id: owner.id,
          overrideAccess: false,
          user: owner,
          context: { allowOwnerChange: lookalike, [lookalike]: true },
        }),
      ).rejects.toThrow('The owner account cannot be deleted.')
    }
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

  describe('owner API key', () => {
    const OWNER_KEY_ERROR = 'The owner account cannot have an API key.'
    const ownerKey = 'owner-key-0123456789abcdef'
    const assistantKey = 'assistant-key-0123456789abcdef'
    const authWithKey = (key: string) =>
      payload.auth({ headers: new Headers({ Authorization: `users API-Key ${key}` }) })

    it('refuses to let the owner give their own account an API key', async () => {
      const owner = await createOwner()
      await expect(
        payload.update({
          collection: 'users',
          id: owner.id,
          data: { enableAPIKey: true, apiKey: ownerKey },
          overrideAccess: false,
          user: owner,
        }),
      ).rejects.toThrow(OWNER_KEY_ERROR)
    })

    it('refuses an owner API key even with access overridden', async () => {
      const owner = await createOwner()
      await expect(
        payload.update({
          collection: 'users',
          id: owner.id,
          data: { enableAPIKey: true, apiKey: ownerKey },
          overrideAccess: true,
        }),
      ).rejects.toThrow(OWNER_KEY_ERROR)
    })

    it('refuses an apiKey on its own, because Payload authenticates by the key alone', async () => {
      const owner = await createOwner()
      await expect(
        payload.update({
          collection: 'users',
          id: owner.id,
          data: { apiKey: ownerKey },
          overrideAccess: true,
        }),
      ).rejects.toThrow(OWNER_KEY_ERROR)
      expect((await authWithKey(ownerKey)).user).toBeNull()
    })

    it('still lets the owner give the assistant an API key', async () => {
      const owner = await createOwner()
      const assistant = await createAssistant()
      await payload.update({
        collection: 'users',
        id: assistant.id,
        data: { enableAPIKey: true, apiKey: assistantKey },
        overrideAccess: false,
        user: owner,
      })
      expect((await authWithKey(assistantKey)).user?.email).toBe('assistant@example.com')
    })
  })

  describe('admin panel', () => {
    // The same computation behind GET /api/access, run on a request for the given user. Payload drops
    // false values from the result, so only an explicit true means access.
    const canAccessAdmin = async (user?: User) => {
      const req = await createLocalReq(
        { user: user ? { ...user, collection: 'users' } : undefined },
        payload,
      )
      return (await getAccessResults({ req })).canAccessAdmin === true
    }

    it('lets the owner into the admin panel', async () => {
      const owner = await createOwner()
      expect(await canAccessAdmin(owner)).toBe(true)
    })

    it('keeps an assistant out of the admin panel', async () => {
      await createOwner()
      const assistant = await createAssistant()
      expect(await canAccessAdmin(assistant)).toBe(false)
    })

    it('keeps a request with no user out of the admin panel', async () => {
      expect(await canAccessAdmin()).toBe(false)
    })

    it('still authenticates the assistant API key for drafting through the API', async () => {
      const owner = await createOwner()
      const assistant = await createAssistant()
      const key = 'assistant-key-0123456789abcdef'
      await payload.update({
        collection: 'users',
        id: assistant.id,
        data: { enableAPIKey: true, apiKey: key },
        overrideAccess: false,
        user: owner,
      })
      const { user } = await payload.auth({
        headers: new Headers({ Authorization: `users API-Key ${key}` }),
      })
      expect(user?.email).toBe('assistant@example.com')
    })
  })

  it('does not let an assistant change their own password or API key', async () => {
    await createOwner()
    const assistant = await createAssistant()
    for (const data of [
      { password: 'attacker-chosen-password' },
      { enableAPIKey: true, apiKey: 'new-key' },
    ]) {
      await expect(
        payload.update({
          collection: 'users',
          id: assistant.id,
          data,
          overrideAccess: false,
          user: assistant,
        }),
      ).rejects.toThrow(/not allowed/i)
    }
  })

  it('does not let an assistant change the owner email, password or API key', async () => {
    const owner = await createOwner()
    const assistant = await createAssistant()
    const attempts = [
      { email: 'attacker@example.com' },
      { password: 'attacker-chosen-password' },
      { enableAPIKey: true, apiKey: 'attacker-key' },
    ]
    for (const data of attempts) {
      await expect(
        payload.update({
          collection: 'users',
          id: owner.id,
          data,
          overrideAccess: false,
          user: assistant,
        }),
      ).rejects.toThrow(/not allowed/i)
    }
    await expect(
      payload.login({ collection: 'users', data: { email: 'owner@example.com', password } }),
    ).resolves.toMatchObject({ user: { email: 'owner@example.com' } })
  })

  it('hides the owner from an assistant looking them up by id', async () => {
    const owner = await createOwner()
    const assistant = await createAssistant()
    await expect(
      payload.findByID({
        collection: 'users',
        id: owner.id,
        overrideAccess: false,
        user: assistant,
      }),
    ).rejects.toThrow(/not found/i)
  })

  it('does not let an assistant create accounts', async () => {
    await createOwner()
    const assistant = await createAssistant()
    await expect(
      payload.create({
        collection: 'users',
        data: { email: 'new@example.com', name: 'New', password, role: 'assistant' },
        overrideAccess: false,
        user: assistant,
      }),
    ).rejects.toThrow(/not allowed/i)
  })

  it('refuses a bulk promotion to owner and reports it per document', async () => {
    const owner = await createOwner()
    await createAssistant()
    const result = await payload.update({
      collection: 'users',
      where: { role: { equals: 'assistant' } },
      data: { role: 'owner' },
      overrideAccess: false,
      user: owner,
    })
    expect(result.docs).toEqual([])
    expect(result.errors.map((error) => error.message)).toEqual([
      'There can only be one owner account.',
    ])
    const { totalDocs } = await payload.count({
      collection: 'users',
      where: { role: { equals: 'owner' } },
    })
    expect(totalDocs).toBe(1)
  })

  it('keeps the owner when a bulk delete matches every account', async () => {
    const owner = await createOwner()
    await createAssistant()
    const result = await payload.delete({
      collection: 'users',
      where: { id: { exists: true } },
      overrideAccess: false,
      user: owner,
    })
    expect(result.docs.map((user) => user.email)).toEqual(['assistant@example.com'])
    expect(result.errors.map((error) => error.message)).toEqual([
      'The owner account cannot be deleted.',
    ])
    await expect(payload.findByID({ collection: 'users', id: owner.id })).resolves.toMatchObject({
      role: 'owner',
    })
  })

  it('lets the owner delete an assistant', async () => {
    const owner = await createOwner()
    const assistant = await createAssistant()
    await expect(
      payload.delete({ collection: 'users', id: assistant.id, overrideAccess: false, user: owner }),
    ).resolves.toMatchObject({ email: 'assistant@example.com' })
  })

  it('lets the owner unlock a locked assistant', async () => {
    const owner = await createOwner()
    await createAssistant()
    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(
        payload.login({
          collection: 'users',
          data: { email: 'assistant@example.com', password: 'wrong' },
        }),
      ).rejects.toThrow()
    }
    await expect(
      payload.unlock({
        collection: 'users',
        data: { email: 'assistant@example.com', password: '' },
        overrideAccess: false,
        req: { user: { ...owner, collection: 'users' } },
      }),
    ).resolves.toBe(true)
    await expect(
      payload.login({ collection: 'users', data: { email: 'assistant@example.com', password } }),
    ).resolves.toMatchObject({ user: { email: 'assistant@example.com' } })
  })

  it('creates at most one owner when first sign-ups race', async () => {
    const results = await Promise.allSettled(
      [1, 2, 3].map((n) =>
        payload.create({
          collection: 'users',
          data: { email: `race${n}@example.com`, name: 'Race', password, role: 'assistant' },
          overrideAccess: false,
        }),
      ),
    )
    const { totalDocs } = await payload.count({
      collection: 'users',
      where: { role: { equals: 'owner' } },
    })
    expect(totalDocs).toBe(1)
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
  })

  it('refuses the first sign-up outside development and tests, even with access overridden', async () => {
    // overrideAccess mirrors what POST /api/users/first-register does.
    for (const nodeEnv of ['production', 'staging', '']) {
      vi.stubEnv('NODE_ENV', nodeEnv)
      try {
        await expect(
          payload.create({
            collection: 'users',
            data: { email: 'first@example.com', name: 'First', password, role: 'owner' },
            overrideAccess: true,
          }),
        ).rejects.toThrow(/owner CLI/)
      } finally {
        vi.unstubAllEnvs()
      }
    }
  })

  it('keeps the maintenance flag through nested Local API calls', async () => {
    const owner = await createOwner()
    const req = await createLocalReq({ context: allowOwnerChange() }, payload)
    await payload.count({ collection: 'users', req })
    await payload.delete({ collection: 'users', id: owner.id, req })
    const { totalDocs } = await payload.count({ collection: 'users' })
    expect(totalDocs).toBe(0)
  })

  it('lets server code demote the owner with the maintenance flag', async () => {
    const owner = await createOwner()
    const updated = await payload.update({
      collection: 'users',
      id: owner.id,
      data: { role: 'assistant' },
      context: allowOwnerChange(),
    })
    expect(updated.role).toBe('assistant')
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
