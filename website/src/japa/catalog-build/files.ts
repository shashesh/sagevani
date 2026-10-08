import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'

// website/japa-catalog/, from website/src/japa/catalog-build/.
const CATALOG_ROOT = resolve(import.meta.dirname, '../../../japa-catalog')

/** The catalog source. */
export const CONTENT_ROOT = join(CATALOG_ROOT, 'content')

/** The reviewed snapshot the version rules check against. Committed. */
export const SNAPSHOT_ROOT = join(CATALOG_ROOT, 'snapshot')

/** Where a build writes each channel's packs and manifest. Not committed. */
export const OUTPUT_ROOT = join(CATALOG_ROOT, 'dist')

/** A file below the content root, by its path relative to the root with `/` separators. */
export interface ContentFile {
  path: string
  text: string
}

/** Every file below `root`, sorted by path. Throws if `root` doesn't exist. */
export function readContentTree(root: string): ContentFile[] {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const full = join(entry.parentPath, entry.name)
      return { path: relative(root, full).split(sep).join('/'), text: readFileSync(full, 'utf8') }
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}
