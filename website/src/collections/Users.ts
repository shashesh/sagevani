import {
  APIError,
  type Access,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
  type PayloadRequest,
  type RequestContext,
} from 'payload'

import {
  ROLES,
  USERS_SLUG,
  isOwner,
  ownerOnly,
  ownerOnlyField,
  ownerOrOwnAccount,
} from '../access/roles'

const LOCK_TIME_MS = 15 * 60 * 1000
const SESSION_SECONDS = 8 * 60 * 60

const OWNER_CHANGE_TOKEN = Symbol('allowOwnerChange')

/**
 * Server-only escape hatch for deliberate owner maintenance (the owner CLI and tests). The key is a
 * string, so Payload keeps it through nested Local API calls; the value is a private Symbol that no
 * HTTP or JSON input can produce. Never merge it into an incoming request's context.
 */
export const allowOwnerChange = (): RequestContext => ({ allowOwnerChange: OWNER_CHANGE_TOKEN })

const ownerChangeAllowed = (context: RequestContext): boolean =>
  context.allowOwnerChange === OWNER_CHANGE_TOKEN

const countUsers = async (req: PayloadRequest, ownersOnly = false): Promise<number> => {
  const { totalDocs } = await req.payload.count({
    collection: USERS_SLUG,
    where: ownersOnly ? { role: { equals: 'owner' } } : undefined,
    overrideAccess: true,
    req,
  })
  return totalDocs
}

// Anyone may create the very first account (it becomes the owner); after that only the owner can.
const ownerOrFirstUser: Access = async ({ req }) => {
  if (isOwner(req.user)) return true
  return (await countUsers(req)) === 0
}

const firstUserIsOwner: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  if ((await countUsers(req)) > 0) return data
  return { ...data, role: 'owner' }
}

// The spec allows exactly one owner: refuse a second one, and refuse demoting the owner.
const keepSingleOwner: CollectionBeforeChangeHook = async ({ context, data, originalDoc, req }) => {
  if (ownerChangeAllowed(context)) return data
  const wasOwner = originalDoc?.role === 'owner'
  const willBeOwner = (data.role ?? originalDoc?.role) === 'owner'
  if (willBeOwner && !wasOwner && (await countUsers(req, true)) > 0) {
    throw new APIError('There can only be one owner account.', 400, undefined, true)
  }
  if (wasOwner && !willBeOwner) {
    throw new APIError('The owner account cannot be demoted.', 400, undefined, true)
  }
  return data
}

const ownerCannotBeDeleted: CollectionBeforeDeleteHook = async ({ context, id, req }) => {
  if (ownerChangeAllowed(context)) return
  const user = await req.payload.findByID({ collection: USERS_SLUG, id, overrideAccess: true, req })
  if (user.role === 'owner') {
    throw new APIError('The owner account cannot be deleted.', 400, undefined, true)
  }
}

export const Users: CollectionConfig = {
  slug: USERS_SLUG,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role'],
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: LOCK_TIME_MS,
    tokenExpiration: SESSION_SECONDS,
    useAPIKey: true,
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  access: {
    create: ownerOrFirstUser,
    read: ownerOrOwnAccount,
    update: ownerOrOwnAccount,
    delete: ownerOnly,
    // Payload's default lets any signed-in user unlock any account, which would let the
    // assistant lift the owner's lockout and keep guessing the password.
    unlock: ownerOnly,
  },
  hooks: {
    beforeChange: [firstUserIsOwner, keepSingleOwner],
    beforeDelete: [ownerCannotBeDeleted],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'assistant',
      saveToJWT: true,
      options: ROLES.map((role) => ({ label: role[0].toUpperCase() + role.slice(1), value: role })),
      access: {
        create: ownerOnlyField,
        update: ownerOnlyField,
      },
    },
  ],
}
