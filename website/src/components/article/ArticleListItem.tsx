import Link from 'next/link'

import { formatDate, readingTimeLabel } from '@/lib/site/format'
import { articlePath } from '@/lib/site/paths'
import type { ArticleCard as Card } from '@/lib/site/types'

import styles from './ArticleListItem.module.css'
import { Cover } from './Cover'
import { LabelRow } from './LabelRow'

interface ArticleListItemProps {
  article: Card
  /** So a caller can nest the row under the heading level its page needs (6.2, 6.3). */
  headingLevel?: 'h2' | 'h3'
}

/**
 * An article as a row with a thumbnail: the landing page's Latest, the archive and a topic page
 * (stage 3 design, 6.2, 6.3).
 */
export function ArticleListItem({ article, headingLevel = 'h3' }: ArticleListItemProps) {
  const published = formatDate(article.publishedAt)
  const meta = [
    published,
    article.readingTime === null ? null : readingTimeLabel(article.readingTime),
    article.difficulty,
  ].filter(Boolean)

  return (
    <article className={styles.row}>
      <Link href={articlePath(article.slug)} className={styles.link}>
        <div className={styles.thumbnail}>
          <Cover cover={article.cover} sizes="120px" variant="card" decorative />
        </div>
        <div className={styles.content}>
          <LabelRow topics={article.topics} shapeLabel={article.shapeLabel} />
          {headingLevel === 'h2' ? (
            <h2 className={styles.title}>{article.title}</h2>
          ) : (
            <h3 className={styles.title}>{article.title}</h3>
          )}
          {article.summary && <p className={styles.summary}>{article.summary}</p>}
          {meta.length > 0 && <p className={styles.meta}>{meta.join(' · ')}</p>}
        </div>
      </Link>
    </article>
  )
}
