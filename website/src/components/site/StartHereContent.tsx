import { ArticleCard } from '@/components/article/ArticleCard'
import { PageView } from '@/components/page/PageView'
import type { StartHereView } from '@/lib/site/types'

import styles from './StartHereContent.module.css'

/** Shown when there is no published Start-here page, so the list still needs a heading. */
export const START_HERE_FALLBACK_TITLE = 'Start here'

/**
 * The Start-here page's body, then its list of articles as cards (stage 3 design, 6.3). Either
 * part alone is enough to render:
 * - a published page with an empty list shows the body alone;
 * - a non-empty list with no published page shows the cards under a fallback heading, since
 *   there is no page title to show instead.
 * The route itself calls notFound() when neither is present, before this ever renders.
 */
export function StartHereContent({ page, articles }: StartHereView) {
  const cards = articles.length > 0 && (
    <div className={styles.grid}>
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  )

  if (page) return <PageView page={page}>{cards}</PageView>

  return (
    <div className="page column">
      <h1>{START_HERE_FALLBACK_TITLE}</h1>
      {cards}
    </div>
  )
}
