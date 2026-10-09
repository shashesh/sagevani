import { assertTestDatabase } from '../helpers/test-database'

/**
 * The browser tests' database: CI's DATABASE_URL, or the local test database. The tests empty it,
 * so anything whose name doesn't end in "_test" is refused.
 */
export const E2E_DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:54329/sagevani_test'

assertTestDatabase(E2E_DATABASE_URL)
