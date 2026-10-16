import Link from 'next/link'

import styles from './ErrorView.module.css'

/**
 * The site's error page (stage 3 design, 6.4 and 8): a generic message with no stack trace and no
 * raw error message, so nothing from the server ever reaches the reader.
 *
 * Placeholder copy (stage 3 design, 9): the owner approves or rewrites the wording in review.
 */
export function ErrorView() {
  return (
    <div className={`page column ${styles.view}`}>
      <p className={styles.label}>Error</p>
      <h1>Something went wrong</h1>
      <p className={styles.text}>
        The page couldn&rsquo;t be shown. Please try again, or come back later.
      </p>
      <p className={styles.links}>
        <Link href="/">Go home</Link>
      </p>
    </div>
  )
}
