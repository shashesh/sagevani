import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { isOwner, ownerOnly, ownerOnlyField, ownerOrSelf } from '@/access/roles'

const reqWith = (user: unknown) => ({ req: { user } as unknown as PayloadRequest })

const owner = { id: 1, role: 'owner' }
const assistant = { id: 2, role: 'assistant' }

describe('isOwner', () => {
  it('is true only for the owner role', () => {
    expect(isOwner(owner as never)).toBe(true)
    expect(isOwner(assistant as never)).toBe(false)
    expect(isOwner(null)).toBe(false)
    expect(isOwner(undefined)).toBe(false)
  })
})

describe('ownerOnly', () => {
  it('allows the owner and denies everyone else', () => {
    expect(ownerOnly(reqWith(owner) as never)).toBe(true)
    expect(ownerOnly(reqWith(assistant) as never)).toBe(false)
    expect(ownerOnly(reqWith(null) as never)).toBe(false)
  })
})

describe('ownerOnlyField', () => {
  it('allows the owner and denies everyone else', () => {
    expect(ownerOnlyField(reqWith(owner) as never)).toBe(true)
    expect(ownerOnlyField(reqWith(assistant) as never)).toBe(false)
  })
})

describe('ownerOrSelf', () => {
  it('gives the owner everything', () => {
    expect(ownerOrSelf(reqWith(owner) as never)).toBe(true)
  })

  it('limits an assistant to their own record', () => {
    expect(ownerOrSelf(reqWith(assistant) as never)).toEqual({ id: { equals: 2 } })
  })

  it('denies anonymous requests', () => {
    expect(ownerOrSelf(reqWith(null) as never)).toBe(false)
  })
})
