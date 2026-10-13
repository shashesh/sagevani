import Link from 'next/link'

import { CORRECTIONS_PATH } from '@/lib/site/paths'
import type { PublicCorrection } from '@/lib/site/types'

import styles from './CorrectionNotes.module.css'

/** Public correction notes, newest first, with a link to every correction across the site. */
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
      <p className={styles.allLink}>
        <Link href={CORRECTIONS_PATH}>All corrections</Link>
      </p>
    </section>
  )
}
