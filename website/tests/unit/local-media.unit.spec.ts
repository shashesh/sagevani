import { randomUUID } from 'crypto'
import { mkdir, rm, writeFile } from 'fs/promises'
import path from 'path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { GET } from '@/app/(frontend)/local-media/[file]/route'
import { LOCAL_MEDIA_DIR } from '@/collections/Media'
import { MEDIA_STORAGE_VARIABLES } from '@/lib/env'
import { imageSrcFor, localMediaType } from '@/lib/site/local-media'

const STORAGE = {
  endpoint: 'https://abcd.storage.supabase.co/storage/v1/s3',
  region: 'us-east-2',
  accessKeyId: 'id',
  secretAccessKey: 'secret',
  bucket: 'media',
  publicUrl: 'https://abcd.supabase.co/storage/v1/object/public/media',
}

describe('localMediaType', () => {
  it('accepts the names uploads are given and returns their type', () => {
    const id = '3f2b8c1e-9d4a-4b6f-8e2d-1a2b3c4d5e6f'
    expect(localMediaType(`${id}.jpg`)).toBe('image/jpeg')
    expect(localMediaType(`${id}.jpeg`)).toBe('image/jpeg')
    expect(localMediaType(`${id}.png`)).toBe('image/png')
    expect(localMediaType(`${id}.webp`)).toBe('image/webp')
    expect(localMediaType(`${id}.avif`)).toBe('image/avif')
  })

  it('refuses any other name, so no path can leave the uploads folder', () => {
    for (const name of [
      'photo.jpg',
      '../.env',
      '3f2b8c1e-9d4a-4b6f-8e2d-1a2b3c4d5e6f.svg',
      '3f2b8c1e-9d4a-4b6f-8e2d-1a2b3c4d5e6f.JPG',
      '3f2b8c1e-9d4a-4b6f-8e2d-1a2b3c4d5e6f.jpg/x',
      '..%2F3f2b8c1e-9d4a-4b6f-8e2d-1a2b3c4d5e6f.jpg',
      '../3f2b8c1e-9d4a-4b6f-8e2d-1a2b3c4d5e6f.jpg',
      '3f2b8c1e-9d4a-4b6f-8e2d-1a2b3c4d5e6f.jpg\n',
    ]) {
      expect(localMediaType(name)).toBeNull()
    }
  })
})

describe('imageSrcFor', () => {
  it('serves from the bucket when storage is on', () => {
    expect(imageSrcFor({ filename: 'a b.jpg' }, STORAGE)).toBe(`${STORAGE.publicUrl}/a%20b.jpg`)
  })

  it('puts a prefix between the bucket address and the file, and none when it is null', () => {
    expect(imageSrcFor({ filename: 'a.jpg', prefix: 'covers' }, STORAGE)).toBe(
      `${STORAGE.publicUrl}/covers/a.jpg`,
    )
    expect(imageSrcFor({ filename: 'a.jpg', prefix: null }, STORAGE)).toBe(
      `${STORAGE.publicUrl}/a.jpg`,
    )
  })

  it('serves from the local route when storage is off', () => {
    expect(imageSrcFor({ filename: 'x.png' }, null)).toBe('/local-media/x.png')
  })
})

describe('GET /local-media/[file]', () => {
  const name = `${randomUUID()}.png`
  const call = (file: string) =>
    GET(new Request(`http://localhost/local-media/${file}`), { params: Promise.resolve({ file }) })

  const storageOff = () => {
    for (const variable of MEDIA_STORAGE_VARIABLES) vi.stubEnv(variable, '')
  }

  afterEach(() => vi.unstubAllEnvs())

  beforeAll(async () => {
    await mkdir(LOCAL_MEDIA_DIR, { recursive: true })
    await writeFile(path.join(LOCAL_MEDIA_DIR, name), Buffer.from('png bytes'))
  })

  afterAll(async () => {
    await rm(path.join(LOCAL_MEDIA_DIR, name), { force: true })
  })

  it('serves an upload with its type while storage is off', async () => {
    storageOff()
    const response = await call(name)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('png bytes')
  })

  it('answers 404 while storage is on, even for a file that exists', async () => {
    vi.stubEnv('MEDIA_S3_ENDPOINT', STORAGE.endpoint)
    vi.stubEnv('MEDIA_S3_REGION', STORAGE.region)
    vi.stubEnv('MEDIA_S3_ACCESS_KEY_ID', STORAGE.accessKeyId)
    vi.stubEnv('MEDIA_S3_SECRET_ACCESS_KEY', STORAGE.secretAccessKey)
    vi.stubEnv('MEDIA_S3_BUCKET', STORAGE.bucket)
    vi.stubEnv('MEDIA_PUBLIC_URL', STORAGE.publicUrl)
    expect((await call(name)).status).toBe(404)
  })

  it('answers 404 for a folder that has an upload name', async () => {
    storageOff()
    const folder = `${randomUUID()}.png`
    await mkdir(path.join(LOCAL_MEDIA_DIR, folder))
    try {
      expect((await call(folder)).status).toBe(404)
    } finally {
      await rm(path.join(LOCAL_MEDIA_DIR, folder), { recursive: true, force: true })
    }
  })

  it('answers 404 for a name it refuses and for a file that is not there', async () => {
    storageOff()
    expect((await call('../.env')).status).toBe(404)
    expect((await call(`${randomUUID()}.png`)).status).toBe(404)
  })
})
