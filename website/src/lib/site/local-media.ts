import { publicFileUrl, type MediaStorageSettings } from '../media-storage'

/** Where uploads are served while storage is off (stage 3 design, 4.5). */
export const LOCAL_MEDIA_PATH = '/local-media'

// Uploads are renamed to a random UUID plus the extension of the type sharp detected (Media.ts).
const UPLOAD_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|avif)$/

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
}

/** The content type of an upload's file name, or null for any name an upload can't have. */
export function localMediaType(name: string): string | null {
  const extension = UPLOAD_NAME.exec(name)?.[1]
  return extension ? TYPES[extension] : null
}

/** An image's address: the public bucket when storage is on, the local route otherwise. */
export function imageSrcFor(
  file: { filename: string; prefix?: string | null },
  storage: MediaStorageSettings | null,
): string {
  return storage
    ? publicFileUrl(storage.publicUrl, file.filename, file.prefix ?? undefined)
    : `${LOCAL_MEDIA_PATH}/${encodeURIComponent(file.filename)}`
}
