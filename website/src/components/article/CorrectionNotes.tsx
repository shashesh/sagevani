import type { PublicCorrection } from '@/lib/site/types'

import styles from './CorrectionNotes.module.css'

/**
 * Public correction notes, newest first. Stage 3b adds the link to /corrections once that page
 * exists, so no link points at a missing page in the meantime.
 */
export function CorrectionNotes({ corrections }: { corrections: PublicCorrection[] }) {
  if (corrections.length === 0) return null
  return (
    <section className={styles.corrections} aria-label="Corrections">
      {corrections.map((correction, index) => (
        <p key={index} className={styles.note}>
          <strong className={styles.lead}>Correction, {correction.date}.</strong>{' '}
          {correction.change}
        </p>
      ))}
    </section>
  )
}
