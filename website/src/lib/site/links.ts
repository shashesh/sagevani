const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/** A stand-in origin: a path is on this site when resolving it against this keeps the origin. */
const SITE_ORIGIN = 'https://site.invalid'

/**
 * An address that may become a link: a path on this site, or an http, https or mailto address.
 * Anything else, such as javascript: or data:, gives null and is shown as plain text
 * (stage 3 design, 4.2). A path is resolved the way a browser does, which drops tabs and newlines
 * and reads "\" as "/", so "/\t/evil.example" and "/\evil.example" are refused.
 */
export function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const href = value.trim()
  try {
    if (href.startsWith('/')) {
      return new URL(href, SITE_ORIGIN).origin === SITE_ORIGIN ? href : null
    }
    return ALLOWED_PROTOCOLS.has(new URL(href).protocol) ? href : null
  } catch {
    return null
  }
}
