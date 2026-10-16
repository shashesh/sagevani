import Link from 'next/link'

import { Byline } from '@/components/article/Byline'
import { Cover } from '@/components/article/Cover'
import { LabelRow } from '@/components/article/LabelRow'
import { articlePath } from '@/lib/site/paths'
import type { ArticleCard } from '@/lib/site/types'

import styles from './FeaturedArticle.module.css'

/**
 * The landing page's featured article (stage 3 design, 6.2): a large cover beside the label row,
 * title, summary and byline. The cover is the page's largest image, so it loads eagerly as the
 * page's LCP element; the title renders as an h2, the page's own h1 being visually hidden.
 */
export function FeaturedArticle({ article }: { article: ArticleCard }) {
  return (
    <article className={styles.featured}>
      <Link href={articlePath(article.slug)} className={styles.link}>
        <Cover
          cover={article.cover}
          sizes="(max-width: 859px) 100vw, 60vw"
          variant="full"
          preload
          decorative
        />
        <div className={styles.text}>
          <LabelRow topics={article.topics} shapeLabel={article.shapeLabel} />
          <h2 className={styles.title}>{article.title}</h2>
          {article.summary && <p className={styles.summary}>{article.summary}</p>}
          <Byline
            publishedAt={article.publishedAt}
            readingTime={article.readingTime}
            difficulty={article.difficulty}
          />
        </div>
      </Link>
    </article>
  )
}
