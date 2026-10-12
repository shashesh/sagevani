import { randomUUID } from 'crypto'
import { mkdir, rm, writeFile } from 'fs/promises'
import path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { GET } from '@/app/(frontend)/local-media/[file]/route'
import { LOCAL_MEDIA_DIR } from '@/collections/Media'
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
    ]) {
      expect(localMediaType(name)).toBeNull()
    }
  })
})

describe('imageSrcFor', () => {
  it('serves from the bucket when storage is on', () => {
    expect(imageSrcFor({ filename: 'a b.jpg' }, STORAGE)).toBe(`${STORAGE.publicUrl}/a%20b.jpg`)
  })

  it('serves from the local route when storage is off', () => {
    expect(imageSrcFor({ filename: 'x.png' }, null)).toBe('/local-media/x.png')
  })
})

describe('GET /local-media/[file]', () => {
  const name = `${randomUUID()}.png`
  const call = (file: string) =>
    GET(new Request(`http://localhost/local-media/${file}`), { params: Promise.resolve({ file }) })

  beforeAll(async () => {
    await mkdir(LOCAL_MEDIA_DIR, { recursive: true })
    await writeFile(path.join(LOCAL_MEDIA_DIR, name), Buffer.from('png bytes'))
  })

  afterAll(async () => {
    await rm(path.join(LOCAL_MEDIA_DIR, name), { force: true })
  })

  it('serves an upload with its type while storage is off', async () => {
    const response = await call(name)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('png bytes')
  })

  it('answers 404 for a name it refuses and for a file that is not there', async () => {
    expect((await call('../.env')).status).toBe(404)
    expect((await call(`${randomUUID()}.png`)).status).toBe(404)
  })
})
