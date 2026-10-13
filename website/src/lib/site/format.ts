import { ARTICLE_SHAPES } from '../../collections/articles/options'

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "11 October 2026", in UTC so a date never shifts with the server's location (stage 3 design, 5.6). */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : DATE_FORMAT.format(date)
}

/** Trimmed text, or null when there is none. */
export const text = (value: string | null | undefined): string | null => value?.trim() || null

export const readingTimeLabel = (minutes: number): string => `${minutes} min read`

/** The shape's label, such as "Inquiry Essay"; null for an unknown or missing shape. */
export function shapeLabel(value: string | null | undefined): string | null {
  return ARTICLE_SHAPES.find((shape) => shape.value === value)?.label ?? null
}

/**
 * The label row's text: the article's topics, in their own order, then its shape (stage 3
 * design, 6.1). Null when there is neither, so a caller can hide the row.
 */
export function labelText({
  topics,
  shapeLabel,
}: {
  topics: { name: string }[]
  shapeLabel: string | null
}): string | null {
  const label = [...topics.map((topic) => topic.name), shapeLabel].filter(Boolean).join(' · ')
  return label || null
}

/** Text from a plain textarea, split into paragraphs at blank lines. */
export function paragraphsOf(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\r?\n[^\S\r\n]*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}
