import { handleEndpoints, ValidationError, type CollectionSlug, type Payload } from 'payload'

import { allowOwnerChange } from '@/collections/Users'
import config from '@/payload.config'
import type { User } from '@/payload-types'

export const PASSWORD = 'correct-horse-battery-staple'
export const ASSISTANT_KEY = 'test-assistant-key-0123456789abcdef'

/**
 * Calls the real REST API, the way the assistant's drafting tool and browsers do: anonymously,
 * or with the assistant's API key. Payload's handler runs in-process; no server is needed.
 */
export function rest(
  method: 'DELETE' | 'GET' | 'PATCH' | 'POST',
  route: string,
  { key, body }: { key?: string; body?: unknown } = {},
): Promise<Response> {
  return handleEndpoints({
    config,
    request: new Request(`http://localhost:3000/api/${route}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `users API-Key ${key}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  })
}

// Referencing collections first, so a document goes before anything it points at.
const CONTENT_COLLECTIONS = ['articles', 'pages', 'media', 'topics', 'difficultyLevels']

/** Deletes every content document and every account. Integration tests only. */
export async function clearContent(payload: Payload): Promise<void> {
  for (const name of CONTENT_COLLECTIONS) {
    const collection = name as CollectionSlug
    // Collections arrive task by task; skip one that isn't registered yet.
    if (!payload.collections[collection]) continue
    await payload.delete({ collection, where: { id: { exists: true } }, overrideAccess: true })
  }
  await payload.delete({
    collection: 'users',
    where: { id: { exists: true } },
    overrideAccess: true,
    context: allowOwnerChange(),
  })
}

/** The owner, and an assistant holding ASSISTANT_KEY. */
export async function createStaff(payload: Payload): Promise<{ owner: User; assistant: User }> {
  const owner = await payload.create({
    collection: 'users',
    data: { email: 'owner@example.com', name: 'Owner', password: PASSWORD, role: 'owner' },
    overrideAccess: true,
  })
  const assistant = await payload.create({
    collection: 'users',
    data: {
      email: 'assistant@example.com',
      name: 'Assistant',
      password: PASSWORD,
      role: 'assistant',
      enableAPIKey: true,
      apiKey: ASSISTANT_KEY,
    },
    overrideAccess: true,
  })
  return { owner, assistant }
}

/**
 * The field messages of the ValidationError an attempt rejects with. Payload's own message is
 * generic ("The following field is invalid: slug"); the rule's wording is in `data.errors`.
 */
export async function validationMessages(attempt: Promise<unknown>): Promise<string[]> {
  const error = await attempt.then(
    () => undefined,
    (thrown: unknown) => thrown,
  )
  if (!(error instanceof ValidationError)) {
    throw new Error(`Expected a ValidationError, got ${String(error)}`)
  }
  return error.data.errors.map(({ message }) => message)
}
