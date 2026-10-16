import type { Metadata } from 'next'
import type { ReactNode } from 'react'

// Global styles first, so the components' module styles override them.
import '@/styles/tokens.css'
import '@/styles/global.css'

import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { getSiteChrome } from '@/lib/site/cached'
import { siteConfig } from '@/lib/site/config'
import { THEME_SCRIPT } from '@/lib/site/theme'
import { literata } from '@/styles/fonts'

export async function generateMetadata(): Promise<Metadata> {
  const { url } = siteConfig()
  const { tagline } = await getSiteChrome()
  return {
    metadataBase: new URL(url),
    title: { default: 'SageVani', template: '%s · SageVani' },
    description: tagline,
    // Site-wide noindex until launch (stage 3 design, 4.6) is each page's own concern
    // (src/lib/site/metadata.ts's siteRobots), not this shared layout's: Next.js reuses a
    // layout's generateMetadata when resolving a not-found render's metadata (see
    // (frontend)/not-found.tsx), so a robots field set here would collide with Next's own,
    // automatic noindex for any response with a status above 400, rendering two
    // <meta name="robots"> tags on every 404.
  }
}

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  const chrome = await getSiteChrome()
  return (
    // The theme script sets data-theme before React hydrates, so the attribute differs on purpose.
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
          {children}
        </main>
        <SiteFooter chrome={chrome} />
      </body>
    </html>
  )
}
