import Image from 'next/image'
import type { CSSProperties } from 'react'

import { coverTermSize } from '@/lib/site/cover'
import type { CoverData } from '@/lib/site/types'

import styles from './Cover.module.css'

interface CoverProps {
  cover: CoverData
  /** The image's displayed width, for next/image. */
  sizes: string
  /** A card shows the term and the mark; the title sits under the card. */
  variant?: 'full' | 'card'
  /** Load the photo first: the article page's cover is its largest image. */
  preload?: boolean
  /** The photo adds nothing a surrounding link or heading doesn't already say. */
  decorative?: boolean
}

/** Design A: the term centred, the title under it, the mark in the corner (stage 3 design, 5.5). */
export function Cover({
  cover,
  sizes,
  variant = 'full',
  preload = false,
  decorative = false,
}: CoverProps) {
  if (cover.photo) {
    return (
      <div className={styles.cover}>
        <Image
          src={cover.photo.url}
          alt={decorative ? '' : cover.photo.alt}
          fill
          sizes={sizes}
          preload={preload}
          className={styles.photo}
        />
      </div>
    )
  }
  const tint = { '--cover-bg': cover.background, '--cover-text': cover.text } as CSSProperties
  return (
    // Drawn from the title and topic, which the page already gives as text.
    <div className={styles.cover} aria-hidden="true">
      <div className={`${styles.drawn} ${styles[coverTermSize(cover.term)]}`} style={tint}>
        <span className={styles.term}>{cover.term}</span>
        {variant === 'full' && cover.term !== cover.title && (
          <span className={styles.title}>{cover.title}</span>
        )}
        <span className={styles.mark}>SageVani</span>
      </div>
    </div>
  )
}
