import { shareLinks } from '@/lib/site/share'

import { CopyLinkButton } from './CopyLinkButton'
import styles from './ShareLinks.module.css'

/** Copy link, WhatsApp, email and X (stage 3 design, 6.1). The like button joins this row in stage 4. */
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const links = shareLinks(url, title)
  return (
    <section className={styles.share} aria-label="Share this article">
      <span className={styles.label}>Share</span>
      <ul className={styles.list}>
        <li>
          <CopyLinkButton url={url} />
        </li>
        <li>
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
            WhatsApp
            <span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </li>
        <li>
          <a href={links.email}>Email</a>
        </li>
        <li>
          <a href={links.x} target="_blank" rel="noopener noreferrer">
            X<span className="visually-hidden"> (opens in a new tab)</span>
          </a>
        </li>
      </ul>
    </section>
  )
}
