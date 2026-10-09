// Run by global-setup.ts before the browser tests. It empties the test database, then creates the
// owner and the one difficulty level the tests use. It refuses any database whose name does not
// end in "_test".
import 'dotenv/config'
import { getPayload } from 'payload'

import { assertTestDatabase } from '../helpers/test-database'
import { E2E_OWNER } from './owner'

assertTestDatabase(process.env.DATABASE_URL)

const { default: config } = await import('../../src/payload.config')
const { allowOwnerChange } = await import('../../src/collections/Users')
const payload = await getPayload({ config })

for (const collection of ['articles', 'pages', 'media', 'topics', 'difficultyLevels'] as const) {
  await payload.delete({ collection, where: { id: { exists: true } }, overrideAccess: true })
}
await payload.delete({
  collection: 'users',
  where: { id: { exists: true } },
  overrideAccess: true,
  context: allowOwnerChange(),
})
await payload.create({
  collection: 'users',
  data: { ...E2E_OWNER, role: 'owner' },
  overrideAccess: true,
  context: allowOwnerChange(),
})
await payload.create({
  collection: 'difficultyLevels',
  data: { name: 'Advanced', order: 3, needsPriorReading: true },
  overrideAccess: true,
})

await payload.destroy()
// Payload keeps background handles open after destroy(); exit explicitly so setup can continue.
process.exit(0)
