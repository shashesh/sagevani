import { readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

import { COVER_SCALE, coverTermSize } from './cover'
import type { CoverData } from './types'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Where the static Literata TTFs for `/og/[slug]` rendering live (assets/fonts/README.md). Resolved
 * from this file's own location, which works the same in `next dev`, a production build and a
 * Netlify deploy: it never depends on `process.cwd()`.
 */
export const OG_FONTS_DIR = path.resolve(dirname, '../../../assets/fonts')

/** The link-preview image's fixed shape (stage 3 design, 6.5). */
export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

/** One cqw at the image's fixed 1200px container width, in pixels. */
const PX_PER_CQW = OG_WIDTH / 100

const px = (cqw: number): number => Math.round(cqw * PX_PER_CQW)

export interface OgLayout {
  padding: number
  term: { fontSize: number }
  title: { marginTop: number; fontSize: number }
  mark: { right: number; bottom: number; fontSize: number }
}

/**
 * Design A's cqw sizing (`COVER_SCALE`, Cover.module.css), resolved to pixels at the image's fixed
 * 1200px width: a cqw is always relative to that one width here, unlike the real page's cover,
 * which scales with whatever width it is drawn at.
 */
export function ogLayout(cover: Pick<CoverData, 'term'>): OgLayout {
  const size = coverTermSize(cover.term)
  return {
    padding: px(COVER_SCALE.padding),
    term: { fontSize: px(COVER_SCALE.term[size]) },
    title: {
      marginTop: px(COVER_SCALE.title.marginTop),
      fontSize: px(COVER_SCALE.title.fontSize),
    },
    mark: {
      right: px(COVER_SCALE.mark.right),
      bottom: px(COVER_SCALE.mark.bottom),
      fontSize: px(COVER_SCALE.mark.fontSize),
    },
  }
}

export interface OgFont {
  name: string
  data: Buffer
  style: 'normal' | 'italic'
  weight: 400 | 500
}

/**
 * The two static Literata cuts `/og/[slug]` draws with (assets/fonts/README.md), shaped for
 * `ImageResponse`'s `fonts` option: Satori cannot read variable fonts or `@font-face`, only font
 * data given directly as a buffer.
 */
export async function loadOgFonts(): Promise<OgFont[]> {
  const [italic, medium] = await Promise.all([
    readFile(path.join(OG_FONTS_DIR, 'Literata72pt-Italic.ttf')),
    readFile(path.join(OG_FONTS_DIR, 'Literata72pt-Medium.ttf')),
  ])
  return [
    { name: 'Literata', data: italic, style: 'italic', weight: 400 },
    { name: 'Literata', data: medium, style: 'normal', weight: 500 },
  ]
}
