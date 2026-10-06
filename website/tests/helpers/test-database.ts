// Integration tests delete rows. This guard keeps them away from any database whose name
// does not end in "_test" — for example a staging or production URL exported in the shell.
export function assertTestDatabase(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error('Refusing to run tests: DATABASE_URL is not set.')
  }

  let name: string
  try {
    name = decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, ''))
  } catch {
    throw new Error('Refusing to run tests: DATABASE_URL is not a valid connection URL.')
  }

  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests: DATABASE_URL must point at a database whose name ends in "_test" (got "${name || 'no database name'}").`,
    )
  }
  return name
}
