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

export type CoverTermSize = 'short' | 'medium' | 'long'

/** How large to draw a cover's term: up to 12 letters, up to 24, or more. */
export function coverTermSize(term: string): CoverTermSize {
  const length = [...term.normalize('NFC')].length
  return length <= 12 ? 'short' : length <= 24 ? 'medium' : 'long'
}
