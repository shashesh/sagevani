import Link from 'next/link'

import { ARCHIVE_PATH } from '@/lib/site/paths'

import styles from './NotFoundView.module.css'

/**
 * The site's 404 page (stage 3 design, 6.4): a message and a link home and to the archive.
 * Shown both for a genuinely unmatched route (global-not-found.tsx) and for a matched route whose
 * content doesn't exist, such as an unpublished article ((frontend)/not-found.tsx).
 *
 * Placeholder copy (stage 3 design, 9): the owner approves or rewrites the wording in review.
 */
export function NotFoundView() {
  return (
    <div className={`page column ${styles.view}`}>
      <p className={styles.label}>404</p>
      <h1>This page can&rsquo;t be found</h1>
      <p className={styles.text}>
        The address may be mistyped, or the page may have moved or been taken down.
      </p>
      <p className={styles.links}>
        <Link href="/">Go home</Link>
        <Link href={ARCHIVE_PATH}>Browse the archive</Link>
      </p>
    </div>
  )
}
