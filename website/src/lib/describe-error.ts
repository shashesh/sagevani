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

// Reduces an error to the first line of its message with every secret value replaced by
// [redacted], so command-line tools never print secrets or stack traces.
export function describeError(error: unknown, secrets: ReadonlyArray<string | undefined>): string {
  const firstLine = (error instanceof Error ? error.message : String(error)).split('\n')[0]
  const present = secrets.filter((value): value is string => Boolean(value?.trim()))
  // Longest first, so a whole connection string goes before the password inside it.
  const targets = [...new Set(present.flatMap((secret) => [secret, ...urlPasswords(secret)]))]
    .filter((value) => value.trim() !== '')
    .sort((a, b) => b.length - a.length)
  return targets.reduce((text, secret) => text.split(secret).join(REDACTED), firstLine)
}
