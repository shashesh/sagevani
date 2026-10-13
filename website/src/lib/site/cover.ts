import type { CoverData, PublicImage, Tint } from './types'

/** The tint of an article with no topic (website design 7.1). */
export const NO_TOPIC_TINT: Tint = { background: '#efe6d2', text: '#2b2621' }

export interface CoverInput {
  title: string
  coverTerm?: string | null
  /** The article's first topic, in its own order. */
  firstTopic: { tint: Tint } | null
  photo: PublicImage | null
}

/** The generated cover, design A (stage 3 design, 5.5). */
export function coverFor({ title, coverTerm, firstTopic, photo }: CoverInput): CoverData {
  const tint = firstTopic?.tint ?? NO_TOPIC_TINT
  return {
    term: coverTerm?.trim() || title,
    title,
    background: tint.background,
    text: tint.text,
    photo,
  }
}

/**
 * The cqw percentages design A's cover draws at (Cover.module.css), so the real CSS and the
 * link-preview renderer (6.5) share one source of truth. A unit test parses Cover.module.css
 * and asserts it matches these values, so the two can never silently drift apart.
 */
export const COVER_SCALE = {
  /** `.drawn`'s padding. */
  padding: 6,
  /** `.term`'s font-size, by coverTermSize. */
  term: { short: 16, medium: 10, long: 6.5 },
  /** `.title`'s margin-top and font-size. */
  title: { marginTop: 3, fontSize: 3.6 },
  /** `.mark`'s right, bottom and font-size. */
  mark: { right: 4, bottom: 3.5, fontSize: 2.8 },
} as const

export type CoverTermSize = 'short' | 'medium' | 'long'

/** Letters, counting a letter with diacritics once. */
const lettersIn = (text: string): number => [...text.normalize('NFC')].length

/**
 * Limits measured in a browser: italic Literata runs 0.5 to 0.57em a letter, and a term has 88% of
 * the cover's width. At the largest size (16cqw) about 9 letters fit a line; at the middle size
 * (10cqw), about 15.
 */
const SHORT_MAX_LENGTH = 9
const MEDIUM_MAX_WORD = 14
const MEDIUM_MAX_LENGTH = 24

/**
 * How large to draw a cover's term. The largest size is for a term that fits one line; the
 * middle size needs its longest word to fit a line and the whole term to fit two lines or
 * three; anything else is smallest. A word is never split, so the longest word counts as well as the length.
 */
export function coverTermSize(term: string): CoverTermSize {
  const length = lettersIn(term)
  const longestWord = Math.max(...term.split(/\s+/).map(lettersIn))
  if (length <= SHORT_MAX_LENGTH) return 'short'
  return longestWord <= MEDIUM_MAX_WORD && length <= MEDIUM_MAX_LENGTH ? 'medium' : 'long'
}
