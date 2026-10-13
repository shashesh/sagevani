import { RichText } from '@/components/rich-text/RichText'
import type { PageView as View } from '@/lib/site/types'

import styles from './PageView.module.css'

/** A page's title and body. */
export function PageView({ page }: { page: View }) {
  return (
    <article className={`page ${styles.page}`}>
      <div className="column">
        <h1 className={styles.title}>{page.title}</h1>
        <RichText data={page.body} context={page.bodyContext} />
      </div>
    </article>
  )
}
