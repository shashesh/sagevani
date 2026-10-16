import { RichText } from '@/components/rich-text/RichText'
import type { ArticleCard, ArticleView as View } from '@/lib/site/types'

import styles from './ArticleView.module.css'
import { BeforeYouRead } from './BeforeYouRead'
import { Byline } from './Byline'
import { CorrectionNotes } from './CorrectionNotes'
import { Cover } from './Cover'
import { LabelRow } from './LabelRow'
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
  return (
    <>
      <ReadingProgress targetId="article-body" />
      <article className={`page ${styles.article}`}>
        <div className="column">
          <header className={styles.header}>
            <LabelRow topics={article.topics} shapeLabel={article.shapeLabel} />
            <h1 className={styles.title}>{article.title}</h1>
            {article.summary && <p className={styles.summary}>{article.summary}</p>}
            <Byline
              publishedAt={article.publishedAt}
              readingTime={article.readingTime}
              difficulty={article.difficulty}
            />
          </header>
          <div className={styles.cover}>
            <Cover cover={article.cover} sizes="(max-width: 720px) 100vw, 680px" preload />
          </div>
          <BeforeYouRead background={article.background} readFirst={article.readFirst} />
          <div id="article-body">
            <RichText data={article.body} context={article.bodyContext} />
          </div>
          {article.slug && <ShareLinks url={shareUrl} title={article.title} />}
          <Sources groups={article.sources} />
          <CorrectionNotes corrections={article.corrections} />
        </div>
      </article>
      <MoreFromTopic topic={article.topics[0] ?? null} articles={related} />
    </>
  )
}
