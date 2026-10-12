const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/**
 * An address that may become a link: a path on this site, or an http, https or mailto address.
 * Anything else, such as javascript: or data:, gives null and is shown as plain text
 * (stage 3 design, 4.2). The URL parser strips tabs and newlines first, so "java\tscript:" is
 * caught too.
 */
export function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const href = value.trim()
  if (/^\/(?![/\\])/.test(href)) return href
  try {
    return ALLOWED_PROTOCOLS.has(new URL(href).protocol) ? href : null
  } catch {
    return null
  }
}
