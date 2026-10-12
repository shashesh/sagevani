import { describe, expect, it } from 'vitest'

import { parseServerEnv } from '@/lib/env'
import {
  mediaStoragePlugin,
  mediaStorageSettings,
  publicFileUrl,
  type MediaStorageSettings,
} from '@/lib/media-storage'

const LOCAL = {
  DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/sagevani',
  PAYLOAD_SECRET: 'a'.repeat(32),
}

const SETTINGS: MediaStorageSettings = {
  endpoint: 'https://abcd.storage.supabase.co/storage/v1/s3',
  region: 'us-east-2',
  accessKeyId: 'access-key-id',
  secretAccessKey: 'secret-access-key',
  bucket: 'media',
  publicUrl: 'https://abcd.supabase.co/storage/v1/object/public/media',
}

const MEDIA_ENV = {
  MEDIA_S3_ENDPOINT: SETTINGS.endpoint,
  MEDIA_S3_REGION: SETTINGS.region,
  MEDIA_S3_ACCESS_KEY_ID: SETTINGS.accessKeyId,
  MEDIA_S3_SECRET_ACCESS_KEY: SETTINGS.secretAccessKey,
  MEDIA_S3_BUCKET: SETTINGS.bucket,
  MEDIA_PUBLIC_URL: SETTINGS.publicUrl,
}

const mediaOptions = (settings: MediaStorageSettings | null) => {
  const media = mediaStoragePlugin(settings).collections.media
  if (!media || media === true) throw new Error('expected collection options for media')
  return media
}

describe('mediaStorageSettings', () => {
  it('is off for a local database with no storage variables', () => {
    expect(mediaStorageSettings(parseServerEnv(LOCAL))).toBeNull()
  })

  it('collects the settings when every variable is set', () => {
    expect(mediaStorageSettings(parseServerEnv({ ...LOCAL, ...MEDIA_ENV }))).toEqual(SETTINGS)
  })
})

describe('publicFileUrl', () => {
  it('appends the file name, and a prefix when there is one', () => {
    expect(publicFileUrl(SETTINGS.publicUrl, 'a1b2.jpg')).toBe(`${SETTINGS.publicUrl}/a1b2.jpg`)
    expect(publicFileUrl(SETTINGS.publicUrl, 'a1b2.jpg', '')).toBe(`${SETTINGS.publicUrl}/a1b2.jpg`)
    expect(publicFileUrl(SETTINGS.publicUrl, 'a1b2.jpg', '2026')).toBe(
      `${SETTINGS.publicUrl}/2026/a1b2.jpg`,
    )
  })
})

describe('mediaStoragePlugin', () => {
  it('turns the adapter off when storage is off, but keeps its fields in the schema', () => {
    const options = mediaStoragePlugin(null)
    expect(options.enabled).toBe(false)
    expect(options.alwaysInsertFields).toBe(true)
  })

  it('points the adapter at Supabase with path-style addressing', () => {
    const options = mediaStoragePlugin(SETTINGS)
    expect(options.enabled).toBe(true)
    expect(options.alwaysInsertFields).toBe(true)
    expect(options.bucket).toBe('media')
    expect(options.config).toEqual({
      endpoint: SETTINGS.endpoint,
      region: SETTINGS.region,
      forcePathStyle: true,
      credentials: { accessKeyId: SETTINGS.accessKeyId, secretAccessKey: SETTINGS.secretAccessKey },
    })
  })

  it('serves files straight from the bucket, without Payload in between', () => {
    const media = mediaOptions(SETTINGS)
    expect(media.disablePayloadAccessControl).toBe(true)
    expect(
      media.generateFileURL?.({ collection: {} as never, filename: 'a1b2.jpg', prefix: '' }),
    ).toBe(`${SETTINGS.publicUrl}/a1b2.jpg`)
  })
})
