import { paragraphsOf } from '@/lib/site/format'
import type { PracticeBlock } from '@/payload-types'

import styles from './PracticeBlock.module.css'

/** The practice invitation, a centred italic coda (stage 3 design, 6.1). */
export function PracticeBlockView({ fields }: { fields: Partial<PracticeBlock> }) {
  return (
    <div className={styles.practice}>
      <p className={styles.label}>Practice</p>
      {paragraphsOf(fields.invitation).map((paragraph, index) => (
        <p key={index} className={styles.invitation}>
          {paragraph}
        </p>
      ))}
    </div>
  )
}
