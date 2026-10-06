import type { Access, FieldAccess } from 'payload'

export const ROLES = ['owner', 'assistant'] as const
export type Role = (typeof ROLES)[number]

/** The only auth collection whose accounts carry a role. Use it as `Users.slug` too. */
export const USERS_SLUG = 'users'

// req.user is read structurally and every property is checked at runtime, so no cast is needed
// and anything unexpected (other auth collection, missing id, unknown role) fails closed.
type RequestUser = { id?: unknown; collection?: unknown; role?: unknown } | null | undefined
type StaffUser = { id: number | string; collection: typeof USERS_SLUG; role: Role }

const isRole = (value: unknown): value is Role => (ROLES as readonly unknown[]).includes(value)

const isStaffUser = (user: RequestUser): user is StaffUser =>
  user?.collection === USERS_SLUG &&
  (typeof user.id === 'number' || (typeof user.id === 'string' && user.id !== '')) &&
  isRole(user.role)

export const isOwner = (user: RequestUser): boolean => isStaffUser(user) && user.role === 'owner'

export const ownerOnly: Access = ({ req }) => isOwner(req.user)

export const ownerOnlyField: FieldAccess = ({ req }) => isOwner(req.user)

/**
 * Users collection only: the owner gets every account, any other staff user only their own.
 * Never reuse on another collection: it compares the document id with the user's id.
 */
export const ownerOrOwnAccount: Access = ({ req }) => {
  const user = req.user
  if (!isStaffUser(user)) return false
  if (user.role === 'owner') return true
  return { id: { equals: user.id } }
}
