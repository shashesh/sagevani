import Link from 'next/link'

import { topicPath } from '@/lib/site/paths'
import type { TopicRef } from '@/lib/site/types'

import styles from './FourQuestions.module.css'

/** A band with each topic's name and question, linking to its page (stage 3 design, 6.2). */
export function FourQuestions({ topics }: { topics: TopicRef[] }) {
  return (
    <section className={styles.band} aria-labelledby="four-questions">
      <div className="page">
        <h2 id="four-questions" className={styles.heading}>
          Four questions
        </h2>
        <div className={styles.grid}>
          {topics.map((topic) => (
            <Link key={topic.id} href={topicPath(topic.slug)} className={styles.topic}>
              <span className={styles.name}>{topic.name}</span>
              <span className={styles.question}>{topic.question}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
