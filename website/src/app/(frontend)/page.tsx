import Link from 'next/link'
import type { Metadata } from 'next'

import { ArticleCard } from '@/components/article/ArticleCard'
import { ArticleListItem } from '@/components/article/ArticleListItem'
import { FeaturedArticle } from '@/components/landing/FeaturedArticle'
import { FourQuestions } from '@/components/landing/FourQuestions'
import { LandingSidebar } from '@/components/landing/LandingSidebar'
import { getLanding } from '@/lib/site/cached'
import { siteRobots } from '@/lib/site/metadata'
import { ARCHIVE_PATH } from '@/lib/site/paths'

import styles from './page.module.css'

/** This page always renders (never calls notFound()), so it may always set its own robots. */
export function generateMetadata(): Metadata {
  return { robots: siteRobots() }
}

/** The landing page (stage 3 design, 6.2): featured article, Featured picks, Latest and sidebar. */
export default async function HomePage() {
  const landing = await getLanding()
  const { featured, picks, latest, sidebar } = landing

  return (
    <>
      <div className="page column">
        {/* The visible name comes from SiteHeader; this h1 exists for assistive tech alone. */}
        <h1 className="visually-hidden">SageVani</h1>
        <div className={styles.layout}>
          <div>
            {featured ? (
              <>
                <FeaturedArticle article={featured} />
                {picks.length > 0 && (
                  <section className={styles.picks} aria-labelledby="landing-featured">
                    <h2 id="landing-featured" className={styles.heading}>
                      Featured
                    </h2>
                    <div className={styles.grid}>
                      {picks.map((article) => (
                        <ArticleCard key={article.id} article={article} />
                      ))}
                    </div>
                  </section>
                )}
                <section className={styles.latest} aria-labelledby="landing-latest">
                  <h2 id="landing-latest" className={styles.heading}>
                    Latest
                  </h2>
                  {latest.map((article) => (
                    <ArticleListItem key={article.id} article={article} headingLevel="h3" />
                  ))}
                  <Link href={ARCHIVE_PATH} className={styles.archiveLink}>
                    All articles →
                  </Link>
                </section>
              </>
            ) : (
              // Placeholder copy (stage 3 design, 9): rewritten or approved by the owner in review.
              <p className={styles.empty}>Nothing has been published here yet.</p>
            )}
          </div>
          <LandingSidebar sidebar={sidebar} />
        </div>
      </div>
      <FourQuestions topics={sidebar.topics} />
    </>
  )
}
