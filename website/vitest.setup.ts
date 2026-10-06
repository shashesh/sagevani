// Test settings take precedence: dotenv never overwrites a variable that is already set,
// so values from .env.test (or CI) win over the developer's .env.
import { config } from 'dotenv'

config({ path: '.env.test' })
config({ path: '.env' })

// Integration tests delete rows. Refuse to run against anything but a *_test database,
// so a DATABASE_URL exported for staging or production can never be wiped by `npm test`.
const databaseName = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? '').pathname.replace(/^\//, '')
  } catch {
    return ''
  }
})()

if (!databaseName.endsWith('_test')) {
  throw new Error(
    `Refusing to run tests: DATABASE_URL must point at a database whose name ends in "_test" (got "${databaseName || 'none'}").`,
  )
}
