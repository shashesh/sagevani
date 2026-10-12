import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

// next/image resizes only images from known places (stage 3 design, 4.5): the public bucket on
// hosted sites, and the local route while storage is off. MEDIA_PUBLIC_URL is checked at
// startup (src/lib/env.ts); here it only names the host.
const mediaPublicUrl = process.env.MEDIA_PUBLIC_URL?.trim()
const bucket = mediaPublicUrl ? new URL(mediaPublicUrl) : null

const nextConfig: NextConfig = {
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
