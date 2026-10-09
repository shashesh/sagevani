/** The largest value of the database's integer ids (Postgres int4). */
const MAX_DATABASE_ID = 2_147_483_647

/** Up to ten ASCII digits: the digits of the largest id. */
const ID_DIGITS = /^\d{1,10}$/

/** The id of a value that is one, or of a populated object holding one; null when it is neither. */
export function idOf(value: unknown): number | string | null {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const { id } = value as { id: unknown }
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

/**
 * Whether a value is an id as the database stores it: a positive whole number within int4, or
 * its digits. Anything else must not reach a query.
 */
export function isDatabaseId(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 && value <= MAX_DATABASE_ID
  }
  return (
    typeof value === 'string' &&
    ID_DIGITS.test(value) &&
    Number(value) > 0 &&
    Number(value) <= MAX_DATABASE_ID
  )
}
