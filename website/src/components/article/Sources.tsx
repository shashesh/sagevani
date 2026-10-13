import type { SourceEntry, SourceGroup } from '@/lib/site/sources'

import styles from './Sources.module.css'

/** One source: author, work, location, edition, link with its access date, and the claim it supports. */
function SourceLine({ entry }: { entry: SourceEntry }) {
  return (
    <li className={styles.entry}>
      {entry.author ? `${entry.author}, ` : null}
      <cite>{entry.work}</cite>
      {entry.location ? `, ${entry.location}` : null}
      {entry.edition ? `. ${entry.edition}` : null}
      {'.'}
      {entry.href ? (
        <>
          {' '}
          <a href={entry.href} className={styles.url}>
            {entry.href}
          </a>
        </>
      ) : null}
      {entry.accessedOn ? ` (accessed ${entry.accessedOn})` : null}
      {entry.claim ? <span className={styles.claim}>Supports: {entry.claim}</span> : null}
    </li>
  )
}

/**
 * Sources in a list you can collapse, grouped in the handbook's tier order. The format is a
 * proposal until Q-07 is decided (stage 3 design, 6.1); only this component would change.
 */
export function Sources({ groups }: { groups: SourceGroup[] }) {
  if (groups.length === 0) return null
  const count = groups.reduce((total, group) => total + group.entries.length, 0)
  return (
    <details className={styles.sources} open>
      <summary className={styles.summary}>
        <h2 className={styles.heading}>Sources ({count})</h2>
      </summary>
      {groups.map((group) => (
        <div key={group.type}>
          <h3 className={styles.group}>{group.label}</h3>
          <ul className={styles.list}>
            {group.entries.map((entry, index) => (
              <SourceLine key={index} entry={entry} />
            ))}
          </ul>
        </div>
      ))}
    </details>
  )
}
