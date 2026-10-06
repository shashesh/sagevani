// Test settings take precedence: dotenv never overwrites a variable that is already set,
// so values from .env.test (or CI) win over the developer's .env.
import { config } from 'dotenv'

import { assertTestDatabase } from './tests/helpers/test-database'

config({ path: '.env.test' })
config({ path: '.env' })

// Integration tests delete rows, so never run against anything but a *_test database.
assertTestDatabase(process.env.DATABASE_URL)
