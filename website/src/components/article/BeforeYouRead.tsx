import Link from 'next/link'

import { paragraphsOf } from '@/lib/site/format'
import type { PriorReading } from '@/lib/site/types'

import styles from './BeforeYouRead.module.css'

/** Helpful background and suggested prior reading, shown when either exists (stage 3 design, 6.1). */
export function BeforeYouRead({
  background,
  readFirst,
}: {
  background: string | null
  readFirst: PriorReading[]
}) {
  if (!background && readFirst.length === 0) return null
  return (
    <aside className={styles.box} aria-labelledby="before-you-read">
      <h2 id="before-you-read" className={styles.heading}>
        Before you read
      </h2>
      {paragraphsOf(background).map((paragraph, index) => (
        <p key={index} className={styles.text}>
          {paragraph}
        </p>
      ))}
      {readFirst.length > 0 && (
        <>
          <h3 className={styles.subheading}>Suggested prior reading</h3>
          <ul className={styles.list}>
            {readFirst.map((item, index) => (
              <li key={index}>
                {item.href?.startsWith('/') ? (
                  <Link href={item.href}>{item.title}</Link>
                ) : item.href ? (
                  <a href={item.href}>{item.title}</a>
                ) : (
                  item.title
                )}
                {item.author && `, ${item.author}`}
                {item.reason && <span className={styles.reason}> — {item.reason}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
