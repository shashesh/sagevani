import Link from 'next/link'

import type { NavigationLink } from '@/lib/site/types'

import styles from './SiteHeader.module.css'
import { ThemeToggle } from './ThemeToggle'

/**
 * The wordmark, the navigation from site settings and the theme toggle (stage 3 design, 5.4).
 * The links are rendered twice: a row on wide screens, and a menu built on <details> under 860px,
 * so the menu works without JavaScript. CSS hides whichever one doesn't apply.
 */
export function SiteHeader({ navigation }: { navigation: NavigationLink[] }) {
  const links = navigation.map((item) => (
    <li key={`${item.path} ${item.label}`}>
      <Link href={item.path}>{item.label}</Link>
    </li>
  ))
  return (
    <header className={styles.header}>
      <div className={`page ${styles.bar}`}>
        <Link href="/" className={styles.wordmark}>
          SageVani
        </Link>
        {links.length > 0 && (
          <nav aria-label="Main" className={styles.nav}>
            <ul className={styles.row}>{links}</ul>
            <details className={styles.menu}>
              <summary>Menu</summary>
              <ul>{links}</ul>
            </details>
          </nav>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
