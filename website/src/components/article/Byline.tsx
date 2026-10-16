import { formatDate, readingTimeLabel } from '@/lib/site/format'

import styles from './Byline.module.css'

interface BylineProps {
  publishedAt: string | null
  readingTime: number | null
  difficulty: string | null
}

/** "Sagevani", the date published, the reading time and the difficulty level (stage 3 design, 6.1). */
export function Byline({ publishedAt, readingTime, difficulty }: BylineProps) {
  const published = formatDate(publishedAt)
  const details = [
    published ? (
      <time key="date" dateTime={publishedAt ?? undefined}>
        {published}
      </time>
    ) : null,
    readingTime === null ? null : readingTimeLabel(readingTime),
    difficulty,
  ].filter(Boolean)

  return (
    <p className={styles.byline}>
      <span className={styles.author}>Sagevani</span>
      {details.map((detail, index) => (
        <span key={index}>
          {' '}
          <span aria-hidden="true">·</span> {detail}
        </span>
      ))}
    </p>
  )
}
