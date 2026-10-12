import { RichText } from '@/components/rich-text/RichText'
import { formatDate, readingTimeLabel } from '@/lib/site/format'
import type { ArticleCard, ArticleView as View } from '@/lib/site/types'

import styles from './ArticleView.module.css'
import { BeforeYouRead } from './BeforeYouRead'
import { CorrectionNotes } from './CorrectionNotes'
import { Cover } from './Cover'
import { MoreFromTopic } from './MoreFromTopic'
import { ReadingProgress } from './ReadingProgress'
import { ShareLinks } from './ShareLinks'
import { Sources } from './Sources'

interface ArticleViewProps {
  article: View
  related: ArticleCard[]
  /** The article's full address, for the share links. */
  shareUrl: string
}

/**
 * The article page, top to bottom (stage 3 design, 6.1). Stage 4 adds the like button to the
 * share row and the comments between the correction notes and "More from".
 */
export function ArticleView({ article, related, shareUrl }: ArticleViewProps) {
  const published = formatDate(article.publishedAt)
  const label = [...article.topics.map((topic) => topic.name), article.shapeLabel]
    .filter(Boolean)
    .join(' · ')
  const details = [
    published ? (
      <time key="date" dateTime={article.publishedAt ?? undefined}>
        {published}
      </time>
    ) : null,
    article.readingTime === null ? null : readingTimeLabel(article.readingTime),
    article.difficulty,
  ].filter(Boolean)

  return (
    <>
      <ReadingProgress targetId="article-body" />
      <article className={`page ${styles.article}`}>
        <div className="column">
          <header className={styles.header}>
            {label && <p className="label">{label}</p>}
            <h1 className={styles.title}>{article.title}</h1>
            {article.summary && <p className={styles.summary}>{article.summary}</p>}
            <p className={styles.byline}>
              <span className={styles.author}>Sagevani</span>
              {details.map((detail, index) => (
                <span key={index}>
                  <span aria-hidden="true"> · </span>
                  {detail}
                </span>
              ))}
            </p>
          </header>
          <div className={styles.cover}>
            <Cover cover={article.cover} sizes="(max-width: 720px) 100vw, 680px" preload />
          </div>
          <BeforeYouRead background={article.background} readFirst={article.readFirst} />
          <div id="article-body">
            <RichText data={article.body} context={article.bodyContext} />
          </div>
          <ShareLinks url={shareUrl} title={article.title} />
          <Sources groups={article.sources} />
          <CorrectionNotes corrections={article.corrections} />
        </div>
      </article>
      <MoreFromTopic topic={article.topics[0] ?? null} articles={related} />
    </>
  )
}
