import type { Access, FieldAccess } from 'payload'

export const ROLES = ['owner', 'assistant'] as const
export type Role = (typeof ROLES)[number]

type RoleHolder = { id?: number | string; role?: Role | null } | null | undefined

export const isOwner = (user: RoleHolder): boolean => user?.role === 'owner'

export const ownerOnly: Access = ({ req }) => isOwner(req.user as RoleHolder)

export const ownerOnlyField: FieldAccess = ({ req }) => isOwner(req.user as RoleHolder)

export const ownerOrSelf: Access = ({ req }) => {
  const user = req.user as RoleHolder
  if (!user) return false
  if (isOwner(user)) return true
  return { id: { equals: user.id } }
}
