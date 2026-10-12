import Link from 'next/link'

import { readingTimeLabel } from '@/lib/site/format'
import { articlePath } from '@/lib/site/metadata'
import type { ArticleCard as Card } from '@/lib/site/types'

import styles from './ArticleCard.module.css'
import { Cover } from './Cover'

/** The cover, title, summary, reading time and difficulty of an article in a list. */
export function ArticleCard({ article }: { article: Card }) {
  const meta = [
    article.readingTime === null ? null : readingTimeLabel(article.readingTime),
    article.difficulty,
  ].filter(Boolean)
  return (
    <article>
      <Link href={articlePath(article.slug)} className={styles.link}>
        <Cover
          cover={article.cover}
          sizes="(max-width: 600px) 100vw, (max-width: 859px) 50vw, 340px"
          variant="card"
          decorative
        />
        <h3 className={styles.title}>{article.title}</h3>
      </Link>
      {article.summary && <p className={styles.summary}>{article.summary}</p>}
      {meta.length > 0 && <p className={styles.meta}>{meta.join(' · ')}</p>}
    </article>
  )
}
