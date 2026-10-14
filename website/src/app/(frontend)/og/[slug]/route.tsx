import { readFile } from 'fs/promises'
import { ImageResponse } from 'next/og'
import path from 'path'
import sharp from 'sharp'

import { LOCAL_MEDIA_DIR } from '@/collections/Media'
import { getArticleCard } from '@/lib/site/cached'
import { LOCAL_MEDIA_PATH } from '@/lib/site/local-media'
import type { OgFont, OgLayout } from '@/lib/site/og'
import { loadOgFonts, OG_HEIGHT, OG_WIDTH, ogLayout } from '@/lib/site/og'
import { isSlug } from '@/lib/site/params'
import type { CoverData } from '@/lib/site/types'

// Reads a Node fs buffer and composites with sharp (the photo branch), neither of which the
// Edge runtime supports.
export const runtime = 'nodejs'

/**
 * No slug is rendered during the build: each renders on its first request and is cached until
 * published content changes, the same as the article page itself (stage 3 design, 6.5, 4.3).
 */
export function generateStaticParams(): { slug: string }[] {
  return []
}

const notFound = (): Response => new Response('Not found', { status: 404 })

/**
 * A public image's bytes, or null if it can't be read. The local-media route serves uploads
 * while storage is off (development and CI) at a relative address; this reads the same file
 * straight off disk instead of making the route fetch its own server over HTTP, which would have
 * to guess its own origin and port. A bucket URL (storage on) is a normal absolute https address,
 * fetched directly.
 */
async function photoBytes(url: string): Promise<Buffer | null> {
  if (url.startsWith(`${LOCAL_MEDIA_PATH}/`)) {
    const filename = decodeURIComponent(url.slice(LOCAL_MEDIA_PATH.length + 1))
    try {
      return await readFile(path.join(LOCAL_MEDIA_DIR, filename))
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code === 'ENOENT' || code === 'EISDIR') return null
      throw error
    }
  }
  const source = await fetch(url)
  return source.ok ? Buffer.from(await source.arrayBuffer()) : null
}

/**
 * An article with a cover photo: the photo cropped to exactly 1200×630 and re-encoded as JPEG
 * (owner decision, overriding the spec's literal "uses the photo instead" — pointing metadata at
 * the raw photo breaks on X, which doesn't accept AVIF, and gives the wrong-shaped preview).
 * sharp (already a dependency) does the crop and re-encode directly; no Satori/ImageResponse
 * involvement is needed for this branch.
 */
async function photoResponse(photo: NonNullable<CoverData['photo']>): Promise<Response> {
  const original = await photoBytes(photo.url)
  if (!original) return notFound()
  const jpeg = await sharp(original)
    .resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover' })
    .jpeg({ quality: 82 })
    .toBuffer()
  return new Response(new Uint8Array(jpeg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

/** A multi-child <div>: Satori requires an explicit display on any element with more than one child node. */
const flexColumn = {
  display: 'flex' as const,
  flexDirection: 'column' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
}

/** Design A, drawn with Satori/ImageResponse: the term centred, the title under it, the mark in the corner. */
function drawnImage(
  cover: Pick<CoverData, 'term' | 'title' | 'background' | 'text'>,
  layout: OgLayout,
  fonts: OgFont[],
): ImageResponse {
  const showTitle = cover.term !== cover.title
  return new ImageResponse(
    <div
      style={{
        ...flexColumn,
        width: '100%',
        height: '100%',
        padding: layout.padding,
        background: cover.background,
        color: cover.text,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontFamily: 'Literata',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: layout.term.fontSize,
          lineHeight: 1.05,
        }}
      >
        {cover.term}
      </div>
      {showTitle ? (
        <div
          style={{
            display: 'flex',
            fontFamily: 'Literata',
            fontWeight: 500,
            fontSize: layout.title.fontSize,
            marginTop: layout.title.marginTop,
            lineHeight: 1.25,
            maxWidth: '75%',
          }}
        >
          {cover.title}
        </div>
      ) : null}
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          right: layout.mark.right,
          bottom: layout.mark.bottom,
          fontFamily: 'Literata',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: layout.mark.fontSize,
        }}
      >
        SageVani
      </div>
    </div>,
    { width: OG_WIDTH, height: OG_HEIGHT, fonts },
  )
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params
  if (!isSlug(slug)) return notFound()
  const article = await getArticleCard(slug)
  if (!article) return notFound()
  if (article.cover.photo) return photoResponse(article.cover.photo)
  const fonts = await loadOgFonts()
  return drawnImage(article.cover, ogLayout(article.cover), fonts)
}
