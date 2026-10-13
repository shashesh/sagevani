import Link from 'next/link'

import type { SiteCorrection } from '@/lib/site/types'

import styles from './CorrectionsView.module.css'

/**
 * Every public correction across published articles, newest first (stage 3 design, 6.3). With
 * none yet, the page still answers 200 with one line of placeholder text, not a 404 (section 9).
 */
export function CorrectionsView({ corrections }: { corrections: SiteCorrection[] }) {
  return (
    <div className="page column">
      <h1>Corrections</h1>
      {corrections.length === 0 ? (
        <p>No corrections have been published yet.</p>
      ) : (
        <ul className={styles.list}>
          {corrections.map((correction, index) => (
            <li key={index} className={styles.item}>
              <p className={styles.lead}>
                Correction, {correction.date} ·{' '}
                <Link href={correction.article.path}>{correction.article.title}</Link>
              </p>
              <p>{correction.change}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
