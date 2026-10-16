import type { Metadata } from 'next'

// Global styles first, so the components' module styles override them. Matches (frontend)/layout.tsx.
import '@/styles/tokens.css'
import '@/styles/global.css'

import { NotFoundView } from '@/components/site/NotFoundView'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { getSiteChrome } from '@/lib/site/cached'
import { THEME_SCRIPT } from '@/lib/site/theme'
import { literata } from '@/styles/fonts'

// No robots field here: Next.js already renders its own, unconditional
// <meta name="robots" content="noindex"> for any response with a status above 400 (see
// NonIndex in next/dist/server/app-render/app-render.js), so a 404 is already never indexed.
// Setting our own robots on top of that would render two <meta name="robots"> tags, since
// Next.js never merges this file's metadata with that automatic tag, it only adds to it.
export const metadata: Metadata = { title: 'Not found' }

/**
 * Next's global 404 (`experimental.globalNotFound`, next.config.ts): it renders for a URL that
 * matches no route at all, which this repo's two root layouts ((frontend) and (payload)) can't
 * otherwise produce a 404 for. It needs its own <html>/<body>, the same global styles, fonts and
 * theme script as (frontend)/layout.tsx, and its own read of the site chrome, since it sits
 * outside every route group's layout.
 *
 * A route matched by (frontend) whose content doesn't exist (an unpublished article, for example)
 * instead renders (frontend)/not-found.tsx, through that group's own layout.
 */
export default async function GlobalNotFound() {
  const chrome = await getSiteChrome()
  return (
    <html lang="en" className={literata.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <SiteHeader navigation={chrome.navigation} />
        <main id="content" tabIndex={-1}>
          <NotFoundView />
        </main>
        <SiteFooter chrome={chrome} />
      </body>
    </html>
  )
}
