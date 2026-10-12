import { text } from '@/lib/site/format'
import type { VerseBlock } from '@/payload-types'

import { devanagari } from './devanagari'
import styles from './VerseBlock.module.css'

/**
 * The text layer: the verse centred between two rules, with the Devanagari when given, the
 * transliteration, the translation, then where it comes from (stage 3 design, 6.1).
 * A block inserted in the editor starts with no fields, so every part is optional here.
 */
export function VerseBlockView({ fields }: { fields: Partial<VerseBlock> }) {
  const devanagariText = text(fields.devanagari)
  const transliteration = text(fields.transliteration)
  const translation = text(fields.translation)
  const citation = [
    [text(fields.textName), text(fields.location)].filter(Boolean).join(' '),
    text(fields.translator),
  ]
    .filter(Boolean)
    .join(' · ')
  return (
    <figure className={styles.verse}>
      <blockquote className={styles.text}>
        {devanagariText && (
          <p lang="sa-Deva" className={`${styles.devanagari} ${devanagari.className}`}>
            {devanagariText}
          </p>
        )}
        {transliteration && (
          <p lang="sa-Latn" className={styles.transliteration}>
            {transliteration}
          </p>
        )}
        {translation && <p className={styles.translation}>{translation}</p>}
      </blockquote>
      {citation && <figcaption className={styles.citation}>{citation}</figcaption>}
    </figure>
  )
}
