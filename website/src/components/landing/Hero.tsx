import styles from './Hero.module.css'

/**
 * The landing page's opening: the tagline set as the page's one real heading, a short accent
 * rule, and the Charter's North Star line (handbook 01) as a fixed subtitle. Text only, no
 * imagery: the site's identity should read like the first line of a quiet magazine, not a banner.
 */
export function Hero({ tagline }: { tagline: string }) {
  return (
    <section className={styles.hero} aria-label="SageVani">
      <div className="page">
        <h1 className={styles.tagline}>{tagline}</h1>
        <div className={styles.rule} aria-hidden="true" />
        <p className={styles.subtitle}>
          A record of one seeker’s attempt to understand Sanātana wisdom by living with its
          questions.
        </p>
      </div>
    </section>
  )
}
