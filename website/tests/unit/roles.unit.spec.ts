import type { PayloadRequest } from 'payload'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  anyone,
  isOwner,
  isStaff,
  nobody,
  ownerOnly,
  ownerOnlyField,
  ownerOrOwnAccount,
  publishedOrStaff,
  staffOnly,
  staffOnlyField,
  type Role,
} from '@/access/roles'
import type { User } from '@/payload-types'

const reqWith = (user: unknown) => ({ req: { user } as unknown as PayloadRequest })

const owner = { id: 1, collection: 'users', role: 'owner' } as const
const assistant = { id: 2, collection: 'users', role: 'assistant' } as const

// None of these may be treated as the owner, and none may get even a self-only constraint.
const untrusted: [string, unknown][] = [
  ['no role', { id: 3, collection: 'users' }],
  ['a null role', { id: 3, collection: 'users', role: null }],
  ['an unknown role', { id: 3, collection: 'users', role: 'admin' }],
  ['a differently cased role', { id: 3, collection: 'users', role: 'Owner' }],
  ['a padded role', { id: 3, collection: 'users', role: ' owner' }],
  ['a role array', { id: 3, collection: 'users', role: ['owner'] }],
  ['an owner from another auth collection', { id: 1, collection: 'subscribers', role: 'owner' }],
  [
    'an assistant from another auth collection',
    { id: 2, collection: 'subscribers', role: 'assistant' },
  ],
  ['an owner with no collection', { id: 1, role: 'owner' }],
  ['an owner with no id', { collection: 'users', role: 'owner' }],
  ['an assistant with no id', { collection: 'users', role: 'assistant' }],
  ['an assistant with a null id', { id: null, collection: 'users', role: 'assistant' }],
  ['an assistant with an empty id', { id: '', collection: 'users', role: 'assistant' }],
  ['an empty object', {}],
  ['an undefined user', undefined],
]

describe('isOwner', () => {
  it('is true only for the owner role', () => {
    expect(isOwner(owner)).toBe(true)
    expect(isOwner(assistant)).toBe(false)
    expect(isOwner(null)).toBe(false)
    expect(isOwner(undefined)).toBe(false)
  })
})

describe('ownerOnly', () => {
  it('allows the owner and denies everyone else', () => {
    expect(ownerOnly(reqWith(owner))).toBe(true)
    expect(ownerOnly(reqWith(assistant))).toBe(false)
    expect(ownerOnly(reqWith(null))).toBe(false)
  })

  it.each(untrusted)('denies %s', (_label, user) => {
    expect(ownerOnly(reqWith(user))).toBe(false)
  })
})

describe('ownerOnlyField', () => {
  it('allows the owner and denies everyone else', () => {
    expect(ownerOnlyField(reqWith(owner))).toBe(true)
    expect(ownerOnlyField(reqWith(assistant))).toBe(false)
    expect(ownerOnlyField(reqWith(null))).toBe(false)
  })

  it.each(untrusted)('denies %s', (_label, user) => {
    expect(ownerOnlyField(reqWith(user))).toBe(false)
  })
})

describe('ownerOrOwnAccount', () => {
  it('gives the owner everything', () => {
    expect(ownerOrOwnAccount(reqWith(owner))).toBe(true)
  })

  it('limits an assistant to their own record', () => {
    expect(ownerOrOwnAccount(reqWith(assistant))).toEqual({ id: { equals: 2 } })
  })

  it('denies anonymous requests', () => {
    expect(ownerOrOwnAccount(reqWith(null))).toBe(false)
  })

  it.each(untrusted)('denies %s outright', (_label, user) => {
    expect(ownerOrOwnAccount(reqWith(user))).toBe(false)
  })
})

describe('ROLES', () => {
  // Checked by `npm run typecheck`: fails if the roles and Payload's generated User type drift apart.
  it('stays in step with the role type Payload generates for users', () => {
    expectTypeOf<User['role']>().toEqualTypeOf<Role>()
  })
})

describe('isStaff, staffOnly and staffOnlyField', () => {
  it('allow the owner and the assistant, and deny everyone else', () => {
    for (const check of [
      (user: unknown) => isStaff(user as never),
      (user: unknown) => staffOnly(reqWith(user)),
      (user: unknown) => staffOnlyField(reqWith(user)),
    ]) {
      expect(check(owner)).toBe(true)
      expect(check(assistant)).toBe(true)
      expect(check(null)).toBe(false)
    }
  })

  it.each(untrusted)('deny %s', (_label, user) => {
    expect(isStaff(user as never)).toBe(false)
    expect(staffOnly(reqWith(user))).toBe(false)
    expect(staffOnlyField(reqWith(user))).toBe(false)
  })
})

describe('nobody', () => {
  it('denies everyone, the owner included', () => {
    expect(nobody(reqWith(owner))).toBe(false)
    expect(nobody(reqWith(assistant))).toBe(false)
    expect(nobody(reqWith(null))).toBe(false)
  })
})

describe('anyone', () => {
  it('allows everyone, signed in or not', () => {
    expect(anyone(reqWith(null))).toBe(true)
    expect(anyone(reqWith(owner))).toBe(true)
  })
})

describe('publishedOrStaff', () => {
  const PUBLISHED_ONLY = { _status: { equals: 'published' } }

  it('gives staff every document', () => {
    expect(publishedOrStaff(reqWith(owner))).toBe(true)
    expect(publishedOrStaff(reqWith(assistant))).toBe(true)
  })

  it('limits everyone else to published documents', () => {
    expect(publishedOrStaff(reqWith(null))).toEqual(PUBLISHED_ONLY)
  })

  it.each(untrusted)('limits %s to published documents', (_label, user) => {
    expect(publishedOrStaff(reqWith(user))).toEqual(PUBLISHED_ONLY)
  })
})
