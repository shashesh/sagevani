import type { ReactNode } from 'react'

import { RichText } from '@/components/rich-text/RichText'
import type { PageView as View } from '@/lib/site/types'

import styles from './PageView.module.css'

interface PageViewProps {
  page: View
  /** Content below the body, such as the Start-here page's list of cards (stage 3 design, 6.3). */
  children?: ReactNode
}

/** A page's title and body, with an optional slot below it. */
export function PageView({ page, children }: PageViewProps) {
  return (
    <article className={`page ${styles.page}`}>
      <div className="column">
        <h1 className={styles.title}>{page.title}</h1>
        <RichText data={page.body} context={page.bodyContext} />
        {children}
      </div>
    </article>
  )
}
