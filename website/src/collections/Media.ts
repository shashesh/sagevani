import { randomUUID } from 'crypto'
import path from 'path'
import type { CollectionBeforeOperationHook, CollectionConfig } from 'payload'
import { fileURLToPath } from 'url'

import { ownerOnly, staffOnly } from '../access/roles'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** Where uploads go when Supabase Storage is off (development and tests). Gitignored. */
export const LOCAL_MEDIA_DIR = path.resolve(dirname, '../../uploads/media')

/** SVG is left out on purpose: it can carry scripts. */
export const MEDIA_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/** Longest side of a stored image, in pixels. */
export const MAX_IMAGE_SIDE = 2400

/** The largest upload accepted, in bytes. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/**
 * A file's name is part of its public URL, so a name like "draft-cover-for-maya.jpg" could be
 * guessed and would describe an unpublished draft. Every upload is stored as a random UUID with
 * its original extension, lowercased.
 */
export const randomFileName: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if ((operation === 'create' || operation === 'update') && req.file) {
    req.file.name = `${randomUUID()}${path.extname(req.file.name).toLowerCase()}`
  }
  return args
}

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'creator', 'licence'],
  },
  access: {
    // Files load straight from the bucket. The API lists uploads and their details, so it is
    // staff-only and an image used only in a draft stays out of sight (stage 2 design, 5).
    read: staffOnly,
    create: staffOnly,
    update: staffOnly,
    delete: ownerOnly,
  },
  hooks: {
    beforeOperation: [randomFileName],
  },
  upload: {
    staticDir: LOCAL_MEDIA_DIR,
    mimeTypes: MEDIA_MIME_TYPES,
    // Uploads come from the owner's computer only; nothing is fetched from a pasted URL.
    pasteURL: false,
    // Any resize option makes Payload re-encode the original through sharp, which drops its
    // metadata (camera, GPS location) because withMetadata is off.
    resizeOptions: {
      width: MAX_IMAGE_SIDE,
      height: MAX_IMAGE_SIDE,
      fit: 'inside',
      withoutEnlargement: true,
    },
  },
  fields: [
    { name: 'alt', label: 'Alt text', type: 'text', required: true },
    { name: 'creator', type: 'text', required: true },
    { name: 'source', type: 'text', required: true },
    { name: 'licence', label: 'Licence or permission', type: 'text', required: true },
    { name: 'notes', type: 'textarea' },
  ],
}
