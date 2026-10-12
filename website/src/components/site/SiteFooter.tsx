import Link from 'next/link'

import type { SiteChrome } from '@/lib/site/types'

import styles from './SiteFooter.module.css'

/**
 * The wordmark, tagline, footer motto (hidden while empty) and navigation (stage 3 design, 5.4).
 * No licence or copyright line until Q-06 is decided. Links use footer-text, never the accent,
 * which is too faint on the footer's ink.
 */
export function SiteFooter({ chrome }: { chrome: SiteChrome }) {
  return (
    <footer className={styles.footer}>
      <div className={`page ${styles.inner}`}>
        <div>
          <p className={styles.wordmark}>SageVani</p>
          <p>{chrome.tagline}</p>
          {chrome.footerMotto && <p className={styles.motto}>{chrome.footerMotto}</p>}
        </div>
        {chrome.navigation.length > 0 && (
          <nav aria-label="Footer">
            <ul className={styles.links}>
              {chrome.navigation.map((item) => (
                <li key={`${item.path} ${item.label}`}>
                  <Link href={item.path}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </footer>
  )
}
