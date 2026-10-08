import { foldDiacritics } from './slug'

export const WORDS_PER_MINUTE = 200

/** Minutes to read, rounded up, never less than one. */
export function readingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))
}

/**
 * The text search matches against: lowercase, diacritics removed, whitespace collapsed. A search
 * folds the reader's query the same way, so "maya" finds "māyā" (website design, 13).
 */
export function searchTextFrom(parts: readonly (string | null | undefined)[]): string {
  return foldDiacritics(parts.filter((part): part is string => Boolean(part)).join(' '))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
