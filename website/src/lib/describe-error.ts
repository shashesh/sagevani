const REDACTED = '[redacted]'

// A connection string's password can be echoed on its own (and decoded) by a driver, so it is
// treated as a secret too.
function urlPasswords(secret: string): string[] {
  let password: string
  try {
    password = new URL(secret).password
  } catch {
    return []
  }
  if (!password) return []
  try {
    return [password, decodeURIComponent(password)]
  } catch {
    return [password]
  }
}

// Some errors (a pg AggregateError across several addresses) have an empty message.
function fallbackLabel(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code
  if (typeof code === 'string' && code) return code
  return error instanceof Error && error.name ? error.name : 'Unknown error'
}

// Reduces an error to the first line of its message with every secret value replaced by
// [redacted], so command-line tools never print secrets or stack traces. Secrets are removed from
// the whole message first, so one that contains a newline cannot leak its first part.
export function describeError(error: unknown, secrets: ReadonlyArray<string | undefined>): string {
  const message = error instanceof Error ? error.message : String(error)
  const present = secrets.filter((value): value is string => Boolean(value?.trim()))
  // Longest first, so a whole connection string goes before the password inside it.
  const targets = [...new Set(present.flatMap((secret) => [secret, ...urlPasswords(secret)]))]
    .filter((value) => value.trim() !== '')
    .sort((a, b) => b.length - a.length)
  const redacted = targets.reduce((text, secret) => text.split(secret).join(REDACTED), message)
  return redacted.split(/\r?\n/u)[0] || fallbackLabel(error)
}
