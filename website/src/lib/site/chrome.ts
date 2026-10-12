import type { Payload } from 'payload'

import { DEFAULT_TAGLINE } from '../../globals/SiteSettings'
import type { SiteChrome } from './types'

/** The tagline, footer motto and navigation from site settings, for the header and footer. */
export async function findSiteChrome(payload: Payload): Promise<SiteChrome> {
  const settings = await payload.findGlobal({
    slug: 'siteSettings',
    overrideAccess: false,
    depth: 0,
    select: { tagline: true, footerMotto: true, navigation: true },
  })
  return {
    tagline: settings.tagline?.trim() || DEFAULT_TAGLINE,
    footerMotto: settings.footerMotto?.trim() || null,
    navigation: (settings.navigation ?? []).map(({ label, path }) => ({ label, path })),
  }
}
