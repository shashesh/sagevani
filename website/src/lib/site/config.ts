import { isLocalDatabase, parseServerEnv, type ServerEnv } from '../env'

/** The address used when the site runs against the local database. */
export const LOCAL_SITE_URL = 'http://localhost:3000'

export interface SiteConfig {
  /** The site's origin, without a trailing slash: canonical links, link previews, share links. */
  url: string
  /** Whether search engines may index the site. Off until launch (stage 3 design, 4.6). */
  indexing: boolean
}

type SiteEnv = Pick<ServerEnv, 'DATABASE_URL'> & Partial<Pick<ServerEnv, 'SITE_URL' | 'SITE_INDEXING'>>

export function siteConfigFrom(env: SiteEnv): SiteConfig {
  if (!env.SITE_URL && !isLocalDatabase(env.DATABASE_URL)) {
    throw new Error('SITE_URL is required for a database that is not local.')
  }
  return { url: env.SITE_URL ?? LOCAL_SITE_URL, indexing: env.SITE_INDEXING === 'on' }
}

/** This process's site settings. Static pages read them during the build, so a missing SITE_URL fails the deploy. */
export function siteConfig(): SiteConfig {
  return siteConfigFrom(parseServerEnv(process.env))
}
