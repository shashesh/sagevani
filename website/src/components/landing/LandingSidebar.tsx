import Link from 'next/link'

import { ArticleCard } from '@/components/article/ArticleCard'
import { paragraphsOf } from '@/lib/site/format'
import { topicPath } from '@/lib/site/paths'
import type { LandingSidebar as Sidebar } from '@/lib/site/types'

import styles from './LandingSidebar.module.css'

/**
 * The landing page's sidebar, below Latest under 860px (stage 3 design, 6.2): About SageVani,
 * Start here (hidden when its list is empty) and Topics (every topic, zero included).
 */
export function LandingSidebar({ sidebar }: { sidebar: Sidebar }) {
  return (
    <aside className={styles.sidebar}>
      <section className={styles.about} aria-labelledby="landing-about">
        <h2 id="landing-about" className={styles.heading}>
          About SageVani
        </h2>
        {paragraphsOf(sidebar.about.text).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
        {sidebar.about.path && <Link href={sidebar.about.path}>Read more →</Link>}
      </section>

      {sidebar.startHere.length > 0 && (
        <section aria-labelledby="landing-start-here">
          <h2 id="landing-start-here" className={styles.heading}>
            Start here
          </h2>
          <div className={styles.cards}>
            {sidebar.startHere.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="landing-topics">
        <h2 id="landing-topics" className={styles.heading}>
          Topics
        </h2>
        <div className={styles.topics}>
          {sidebar.topics.map((topic) => (
            <Link key={topic.id} href={topicPath(topic.slug)}>
              {topic.name} <span className={styles.count}>({topic.articleCount})</span>
            </Link>
          ))}
        </div>
      </section>
    </aside>
  )
}
