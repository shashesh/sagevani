import path from 'path'
import { getPayload, handleEndpoints, ValidationError, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { LOCAL_MEDIA_DIR, MAX_IMAGE_SIDE } from '@/collections/Media'
import config from '@/payload.config'
import type { User } from '@/payload-types'

import { ASSISTANT_KEY, clearContent, createStaff, rest } from '../helpers/content'

let payload: Payload
let owner: User

const DETAILS = { alt: 'A lamp', creator: 'Sagevani', source: 'Own photo', licence: 'Own work' }

const photo = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#887766' } })
    .jpeg()
    .withExif({ IFD0: { Copyright: 'camera-owner-name' } })
    .toBuffer()

const upload = async (data: Buffer, name: string, mimetype: string, user: User = owner) =>
  payload.create({
    collection: 'media',
    data: DETAILS,
    file: { data, mimetype, name, size: data.length },
    overrideAccess: false,
    user,
  })

describe('media', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearContent(payload)
    ;({ owner } = await createStaff(payload))
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  it('stores every upload under a random name, keeping its extension in lowercase', async () => {
    const media = await upload(await photo(640, 400), 'Draft-Cover-For-Maya.JPG', 'image/jpeg')
    expect(media.filename).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/,
    )
    expect(media.filename).not.toMatch(/maya/i)
    expect(media.mimeType).toBe('image/jpeg')
  })

  it('refuses SVG content declared as a JPEG', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    )
    await expect(upload(svg, 'x.jpg', 'image/jpeg')).rejects.toThrow()
  })

  it('refuses HTML content declared as a JPEG', async () => {
    const html = Buffer.from('<html><script>alert(1)</script></html>')
    await expect(upload(html, 'x.jpg', 'image/jpeg')).rejects.toThrow()
  })

  it.each(['photo.jpg.html', 'photo'])(
    'names a real JPEG uploaded as %s by its type, not its original extension',
    async (original) => {
      const media = await upload(await photo(100, 100), original, 'image/jpeg')
      expect(media.filename).toMatch(/^[0-9a-f-]{36}\.jpg$/)
      expect(media.mimeType).toBe('image/jpeg')
    },
  )

  it('stores a replacement file under a new random name', async () => {
    const first = await upload(await photo(100, 100), 'a.jpg', 'image/jpeg')
    const data = await photo(120, 120)
    const updated = await payload.update({
      collection: 'media',
      id: first.id,
      data: {},
      file: { data, mimetype: 'image/jpeg', name: 'b.jpg', size: data.length },
      overrideAccess: false,
      user: owner,
    })
    expect(updated.filename).toMatch(/^[0-9a-f-]{36}\.jpg$/)
    expect(updated.filename).not.toBe(first.filename)
  })

  it('caps the longest side at 2,400 pixels and strips metadata such as the camera owner', async () => {
    const original = await photo(3000, 1000)
    expect((await sharp(original).metadata()).exif).toBeDefined()

    const media = await upload(original, 'wide.jpg', 'image/jpeg')
    expect(media.width).toBe(MAX_IMAGE_SIDE)
    expect(media.height).toBe(800)
    const stored = await sharp(path.join(LOCAL_MEDIA_DIR, media.filename!)).metadata()
    expect(stored.exif).toBeUndefined()
    expect(stored.width).toBe(MAX_IMAGE_SIDE)
  })

  it('never enlarges a small image', async () => {
    const media = await upload(await photo(300, 200), 'small.jpg', 'image/jpeg')
    expect(media.width).toBe(300)
  })

  it('refuses SVG, which can carry scripts', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
    )
    await expect(upload(svg, 'x.svg', 'image/svg+xml')).rejects.toThrow(/invalid: file/)
  })

  it('refuses an upload over 4 MB with a 413', async () => {
    const form = new FormData()
    form.append(
      'file',
      new Blob([new Uint8Array(5 * 1024 * 1024)], { type: 'image/png' }),
      'big.png',
    )
    form.append('_payload', JSON.stringify(DETAILS))
    const response = await handleEndpoints({
      config,
      request: new Request('http://localhost:3000/api/media', {
        method: 'POST',
        headers: { Authorization: `users API-Key ${ASSISTANT_KEY}` },
        body: form,
      }),
    })
    expect(response.status).toBe(413)
  })

  it('requires alt text, creator, source and licence', async () => {
    const data = await photo(100, 100)
    const error = await payload
      .create({
        collection: 'media',
        data: { alt: 'Only alt' } as typeof DETAILS,
        file: { data, mimetype: 'image/jpeg', name: 'x.jpg', size: data.length },
        overrideAccess: false,
        user: owner,
      })
      .then(
        () => undefined,
        (thrown: unknown) => thrown,
      )
    expect(error).toBeInstanceOf(ValidationError)
    const paths = (error as ValidationError).data.errors.map(({ path }) => path)
    expect(paths).toEqual(expect.arrayContaining(['creator', 'source', 'licence']))
  })

  it('keeps uploads and their details out of the public API', async () => {
    const media = await upload(await photo(100, 100), 'x.jpg', 'image/jpeg')
    expect((await rest('GET', 'media')).status).toBe(403)
    expect((await rest('GET', `media/${media.id}`)).status).toBe(403)
  })

  it('lets the assistant upload and read media, but not delete it', async () => {
    const list = await rest('GET', 'media', { key: ASSISTANT_KEY })
    expect(list.status).toBe(200)
    const media = await upload(await photo(100, 100), 'x.jpg', 'image/jpeg')
    expect((await rest('DELETE', `media/${media.id}`, { key: ASSISTANT_KEY })).status).toBe(403)
  })
})
