import { readFile } from 'fs/promises'
import path from 'path'

import { LOCAL_MEDIA_DIR } from '@/collections/Media'
import { parseServerEnv } from '@/lib/env'
import { mediaStorageSettings } from '@/lib/media-storage'
import { localMediaType } from '@/lib/site/local-media'

const notFound = (): Response => new Response('Not found', { status: 404 })

/**
 * Serves an upload from the local folder, only while storage is off: in development and CI.
 * Storage is required wherever the database isn't local, so this never serves on a hosted site.
 * Only upload names are accepted, so no path can leave the folder, and nothing is ever listed.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params
  const type = localMediaType(file)
  if (!type || mediaStorageSettings(parseServerEnv(process.env)) !== null) return notFound()
  try {
    const data = await readFile(path.join(LOCAL_MEDIA_DIR, file))
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    // Only a missing file is a 404; anything else is a server error that Next should log.
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT' || code === 'EISDIR') return notFound()
    throw error
  }
}
