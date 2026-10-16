'use client'

// Bundled at build time, not read at request time, so these are safe even if the root layout's
// own data read is what crashed.
import '@/styles/tokens.css'
import '@/styles/global.css'

import { ErrorView } from '@/components/site/ErrorView'
import { literata } from '@/styles/fonts'

import styles from './global-error.module.css'

/**
 * Renders only when the root layout itself throws while rendering (stage 3 design, 6.4 and 8),
 * which replaces the entire document, so it supplies its own <html>/<body>. It must not depend on
 * any data read: if the root layout is what crashed, getSiteChrome (and so the database) can't be
 * trusted to work, so no site chrome (header, footer, navigation) is read or rendered. This is a
 * minimal, self-contained fallback with only a wordmark and the generic error message.
 */
export default function GlobalError(_props: { error: Error & { digest?: string } }) {
  return (
    <html lang="en" className={literata.variable}>
      <body>
        <p className={styles.wordmark}>SageVani</p>
        <ErrorView />
      </body>
    </html>
  )
}
