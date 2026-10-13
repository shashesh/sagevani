import { paragraphsOf, text } from '@/lib/site/format'
import type { TraditionBlock } from '@/payload-types'

import styles from './TraditionBlock.module.css'

/** A named tradition's reading, as an indented gloss under its attribution (stage 3 design, 6.1). */
export function TraditionBlockView({ fields }: { fields: Partial<TraditionBlock> }) {
  return (
    <div className={styles.tradition}>
      {text(fields.school) && (
        <p className={styles.attribution}>As {text(fields.school)} reads it</p>
      )}
      <div className={styles.reading}>
        {paragraphsOf(fields.interpretation).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  )
}
