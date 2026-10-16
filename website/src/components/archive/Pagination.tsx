import Link from 'next/link'

import { archiveHref, type ArchiveFilters } from '@/lib/site/archive'
import { ARCHIVE_PATH } from '@/lib/site/paths'

import styles from './Pagination.module.css'

interface PaginationProps {
  page: number
  totalPages: number
  filters: ArchiveFilters
  /** The archive's own address by default; a topic page (6.3) passes its own path instead. */
  base?: string
}

/**
 * Links to the previous and next archive page, built from the current filters so a filtered list
 * keeps its filters across pages (stage 3 design, 6.3). Page 1's own address never carries a
 * `page` parameter (archiveHref).
 *
 * Placeholder copy (stage 3 design, 9): "Newer", "Older" and "Page n of m" are proposals the owner
 * has not yet approved or rewritten.
 */
export function Pagination({ page, totalPages, filters, base = ARCHIVE_PATH }: PaginationProps) {
  if (totalPages <= 1) return null
  const previousHref = page > 1 ? archiveHref(base, filters, page - 1) : null
  const nextHref = page < totalPages ? archiveHref(base, filters, page + 1) : null

  return (
    <nav className={styles.pagination} aria-label="Archive pages">
      {previousHref ? (
        <Link href={previousHref} rel="prev">
          Newer
        </Link>
      ) : (
        <span className={styles.disabled} aria-hidden="true">
          Newer
        </span>
      )}
      <span className={styles.status}>
        Page {page} of {totalPages}
      </span>
      {nextHref ? (
        <Link href={nextHref} rel="next">
          Older
        </Link>
      ) : (
        <span className={styles.disabled} aria-hidden="true">
          Older
        </span>
      )}
    </nav>
  )
}
