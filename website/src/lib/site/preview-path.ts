import { isDatabaseId } from '../ids'

export type PreviewCollection = 'articles' | 'pages'

/** The live preview's address for a saved document, or null before it has an id (stage 3 design, 4.4). */
export function previewPath(collection: PreviewCollection, id: unknown): string | null {
  return isDatabaseId(id) ? `/preview/${collection}/${String(id)}` : null
}

/** The device sizes offered beside the editor. */
export const PREVIEW_BREAKPOINTS = [
  { label: 'Phone', name: 'phone', width: 375, height: 667 },
  { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
  { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
]
