import type { ArticleCard as Card, TopicRef } from '@/lib/site/types'

import { ArticleCard } from './ArticleCard'
import styles from './MoreFromTopic.module.css'

/** Up to three other articles from the article's first topic; hidden when there are none. */
export function MoreFromTopic({ topic, articles }: { topic: TopicRef | null; articles: Card[] }) {
  if (!topic || articles.length === 0) return null
  return (
    <section className={styles.more} aria-labelledby="more-from">
      <div className="page">
        <h2 id="more-from" className={styles.heading}>
          More from {topic.name}
        </h2>
        <div className={styles.grid}>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  )
}
