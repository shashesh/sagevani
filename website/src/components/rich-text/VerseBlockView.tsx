import type { VerseBlock } from '@/payload-types'

import { devanagari } from './devanagari'
import styles from './VerseBlock.module.css'

/**
 * The text layer: the verse centred between two rules, with the Devanagari when given, the
 * transliteration, the translation, then where it comes from (stage 3 design, 6.1).
 */
export function VerseBlockView({ fields }: { fields: VerseBlock }) {
  const devanagariText = fields.devanagari?.trim()
  const transliteration = fields.transliteration.trim()
  const translation = fields.translation.trim()
  return (
    <figure className={styles.verse}>
      <blockquote className={styles.text}>
        {devanagariText && (
          <p lang="sa-Deva" className={`${styles.devanagari} ${devanagari.className}`}>
            {devanagariText}
          </p>
        )}
        <p lang="sa-Latn" className={styles.transliteration}>
          {transliteration}
        </p>
        <p className={styles.translation}>{translation}</p>
      </blockquote>
      <figcaption className={styles.citation}>
        {fields.textName} {fields.location} · {fields.translator}
      </figcaption>
    </figure>
  )
}
