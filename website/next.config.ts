import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// next/image resizes only images from known places (stage 3 design, 4.5): the public bucket on
// hosted sites, and the local route while storage is off. MEDIA_PUBLIC_URL is checked at
// startup (src/lib/env.ts); here it only names the host.
function parseMediaPublicUrl(value: string): URL {
  try {
    return new URL(value)
  } catch {
    throw new Error('MEDIA_PUBLIC_URL must be an https:// URL with no ? or #')
  }
}

const mediaPublicUrl = process.env.MEDIA_PUBLIC_URL?.trim()
const bucket = mediaPublicUrl ? parseMediaPublicUrl(mediaPublicUrl) : null

const nextConfig: NextConfig = {
  // Needed for src/app/global-not-found.tsx: this repo has no single top-level root layout, since
  // (frontend) and (payload) each keep their own, which is exactly the "multiple root layouts"
  // case this flag documents.
  experimental: { globalNotFound: true },
  // /og/[slug]'s static Literata TTFs (6.5) are read with fs.readFile at a path resolved from
  // this module's own location, not a statically analyzable import, so Next's file tracing never
  // finds them on its own (verified against the built route's .nft.json): without this, a
  // deployed function would ship without the fonts it needs at request time. The key matches the
  // route's normalized app path (app-paths' normalizeAppPath strips the (frontend) group and the
  // trailing /route), not the file path on disk.
  //
  // CONFIRMED LIMITATION (Next 16.3.8): this only takes effect in a `next build --webpack` build
  // — verified by inspecting the built route's .nft.json both ways. The default `next build`
  // (Turbopack, what `npm run build` runs) never reaches the "Collecting build traces" step this
  // option hooks into, so the fonts are NOT added to the traced file list it ships to a
  // deployment platform that prunes by trace (such as @netlify/plugin-nextjs). This entry is kept
  // because it is harmless and becomes correct the moment Turbopack gains the same step, but
  // until then a Netlify deploy preview must be checked by hand (design 10) that /og/[slug]
  // actually renders design A, not a fallback/garbled font — this was flagged back rather than
  // silently shipped as fixed.
  outputFileTracingIncludes: {
    '/og/[slug]': ['./assets/fonts/*.ttf'],
  },
  images: {
    localPatterns: [{ pathname: '/local-media/**', search: '' }],
    remotePatterns: bucket
      ? [
          {
            protocol: 'https',
            hostname: bucket.hostname,
            pathname: `${bucket.pathname.replace(/\/+$/, '')}/**`,
          },
        ]
      : [],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
