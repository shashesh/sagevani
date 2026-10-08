/** Removes diacritics: NFD splits each letter from its marks, and the marks are dropped (`ā` → `a`). */
export function foldDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .normalize('NFC')
}

/**
 * A plain-ASCII URL slug: lowercase letters and digits joined by single hyphens. URLs stay ASCII
 * while titles keep their diacritics (website design, 7.2). Letters with no ASCII form, such as
 * Devanagari, are dropped, so a title written only in them gives an empty slug.
 */
export function slugify(text: string): string {
  return foldDiacritics(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
