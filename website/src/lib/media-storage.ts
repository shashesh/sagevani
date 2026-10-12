import type { S3StorageOptions } from '@payloadcms/storage-s3'

import type { ServerEnv } from './env'

export interface MediaStorageSettings {
  endpoint: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  /** The bucket's public address, e.g. https://<ref>.supabase.co/storage/v1/object/public/media */
  publicUrl: string
}

/** Supabase Storage settings, or null when media is stored on local disk. */
export function mediaStorageSettings(env: ServerEnv): MediaStorageSettings | null {
  const {
    MEDIA_S3_ENDPOINT: endpoint,
    MEDIA_S3_REGION: region,
    MEDIA_S3_ACCESS_KEY_ID: accessKeyId,
    MEDIA_S3_SECRET_ACCESS_KEY: secretAccessKey,
    MEDIA_S3_BUCKET: bucket,
    MEDIA_PUBLIC_URL: publicUrl,
  } = env
  // parseServerEnv guarantees all or none.
  if (!endpoint || !region || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) return null
  return { endpoint, region, accessKeyId, secretAccessKey, bucket, publicUrl }
}

/** A stored file's public address in the bucket. */
export function publicFileUrl(publicUrl: string, filename: string, prefix?: string): string {
  return `${publicUrl}/${prefix ? `${prefix}/` : ''}${encodeURIComponent(filename)}`
}

/**
 * Options for Payload's S3 adapter, pointed at Supabase Storage's S3-compatible endpoint.
 * - Off (null settings), uploads go to the media collection's local folder.
 * - The adapter's fields are inserted either way, so every environment has the same schema
 *   and migrations generated locally match production.
 * - Files are served straight from the public bucket by their random names. Payload's file
 *   route, which would check the staff-only read access, is bypassed.
 */
export function mediaStoragePlugin(settings: MediaStorageSettings | null): S3StorageOptions {
  return {
    enabled: settings !== null,
    alwaysInsertFields: true,
    bucket: settings?.bucket ?? 'media',
    collections: {
      media: {
        disablePayloadAccessControl: true,
        generateFileURL: ({ filename, prefix }) =>
          publicFileUrl(settings?.publicUrl ?? '', filename, prefix),
      },
    },
    config: settings
      ? {
          endpoint: settings.endpoint,
          region: settings.region,
          forcePathStyle: true,
          credentials: {
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey,
          },
        }
      : {},
  }
}
