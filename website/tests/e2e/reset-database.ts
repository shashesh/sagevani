// Run by global-setup.ts, and by useScenario() (scenario.ts), before the browser tests. It empties
// the test database, then creates the owner and the two difficulty levels the tests use, and
// seeds one of three named scenarios (see scenario.ts for what each is for):
//   - standard: 3a's reading content (seed-reading.ts) plus 3b's topics, pages, settings and
//     archive-sized article list (seed-site.ts). The default, and what most tests assume.
//   - empty: just the owner, the levels and the topics. Nothing published.
//   - six: exactly six published articles, curated settings and one published About page.
// It refuses any database whose name does not end in "_test".
import 'dotenv/config'
import { getPayload } from 'payload'

import { assertTestDatabase } from '../helpers/test-database'
import { E2E_OWNER } from './owner'
import type { Scenario } from './scenario'

assertTestDatabase(process.env.DATABASE_URL)

const scenario = (process.argv[2] || 'standard') as Scenario

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
const owner = await payload.create({
  collection: 'users',
  data: { ...E2E_OWNER, role: 'owner' },
  overrideAccess: true,
  context: allowOwnerChange(),
})

const { createAllTopics, createArchiveArticles, createOtherTopics, createSixScenario, createStandardPages } =
  await import('./seed-site')

if (scenario === 'standard') {
  const advanced = await payload.create({
    collection: 'difficultyLevels',
    data: { name: 'Advanced', order: 3, needsPriorReading: true },
    overrideAccess: true,
  })
  const { seedReading } = await import('./seed-reading')
  const { beginner, dharma } = await seedReading(payload, owner)
  const otherTopics = await createOtherTopics(payload)
  await createStandardPages(payload, owner)
  await createArchiveArticles(payload, owner, otherTopics, { beginner, advanced })
  void dharma // kept out of the archive articles' topics; see createArchiveArticles' comment
} else if (scenario === 'six') {
  const beginner = await payload.create({
    collection: 'difficultyLevels',
    data: { name: 'Beginner', order: 1, needsPriorReading: false },
    overrideAccess: true,
  })
  await payload.create({
    collection: 'difficultyLevels',
    data: { name: 'Advanced', order: 3, needsPriorReading: true },
    overrideAccess: true,
  })
  await createAllTopics(payload)
  await createSixScenario(payload, owner, beginner)
} else if (scenario === 'empty') {
  await payload.create({
    collection: 'difficultyLevels',
    data: { name: 'Beginner', order: 1, needsPriorReading: false },
    overrideAccess: true,
  })
  await payload.create({
    collection: 'difficultyLevels',
    data: { name: 'Advanced', order: 3, needsPriorReading: true },
    overrideAccess: true,
  })
  await createAllTopics(payload)
} else {
  throw new Error(`Unknown scenario "${scenario}"`)
}

await payload.destroy()
// Payload keeps background handles open after destroy(); exit explicitly so setup can continue.
process.exit(0)
