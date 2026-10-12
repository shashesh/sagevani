# SageVani website — Stage 3a (The reading experience) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A reader can open a published article at `/articles/[slug]` in the site's "Manuscript" design, in light or dark, and the owner previews a draft beside the editor before publishing it. Pages are cached and refresh when published content changes.

**Architecture:**

- **One public data layer.** `src/lib/site/` holds every public read. Its functions take a `Payload` instance and read as an anonymous visitor (`overrideAccess: false`, no user, `depth: 0`, an explicit `select`), so the collections' access rules decide what comes back. Related documents (topics, levels, images, link targets) are looked up by id in batched queries rather than populated. Images are the one read that overrides access, for four fields only.
- **Caching.** `src/lib/site/cached.ts` wraps those functions in `unstable_cache` with the tag `site`. Pages are static where they can be. `refreshSite()` calls `revalidateTag('site', { expire: 0 })` after any change to published content. Payload hooks in `src/collections/shared/refresh.ts` decide when, using a `draftSave` flag that a `beforeOperation` hook records. Outside a Next runtime (scripts, migrations, tests) the refresh does nothing.
- **Pure helpers** (dates, links, sources, covers, progress, the theme script) live in `src/lib/site/` with unit tests. Components in `src/components/` only arrange their output.
- **Live preview.** Staff-only, uncached routes at `/preview/articles/[id]` and `/preview/pages/[id]` render the latest draft with the public components. Payload's live preview shows them beside the editor and `RefreshRouteOnSave` reloads them after each autosave.
- **Styling.** A tokens file with both themes, a global stylesheet and one CSS Module per component. Literata comes through `next/font`. Tiro Devanagari Sanskrit is declared only in the verse component, with `preload: false`.

**Tech Stack:** Next.js 16.3.8 (App Router, `next/font/google`, `next/image`, `unstable_cache`), Payload 3.90.2 (`@payloadcms/richtext-lexical/react`, `@payloadcms/live-preview-react` 3.90.2), React 19.2, TypeScript 5.7, Zod 4, Vitest 4, Playwright 1.58 with `@axe-core/playwright` 4.13.0.

**Spec:** [`../specs/2026-10-11-stage-3-public-site-design.md`](../specs/2026-10-11-stage-3-public-site-design.md), which builds on [the website design](../specs/2026-10-05-sagevani-website-design.md) sections 4, 6, 7, 12 and 13. This plan builds pull request 3a (spec section 3). Stage 3b gets its own plan.

---

## Before you start

- **Verified in advance.** On 2026-10-11 a throwaway spike against Next 16.3.8, Payload 3.90.2 and a real Postgres 17 ran the risky parts of this plan, under `next dev` and under `next build && next start`. These facts from that run are built into the tasks:
  1. Inside a Payload hook running in a Next request, `process.env.NEXT_RUNTIME` is `'nodejs'`, under both Turbopack dev and a production build. Under tsx and the Local API (scripts, migrations, tests) it is `undefined`. There, `revalidateTag` throws `Invariant: static generation store missing`, so `refreshSite()` returns early when it's unset.
  2. `revalidateTag(tag, profile)` needs its second argument in 16.3.8. `revalidateTag('site', { expire: 0 })` type-checks. After a publish, the very first request is already fresh (`x-nextjs-cache: MISS`), and the next one is a `HIT`.
  3. A dynamic route that exports `generateStaticParams` returning `[]` is built as SSG with no query during `next build`. Its pages render on their first request and are then cached (`s-maxage=31536000`). A 404 is cached too, and the refresh clears it.
  4. **An unpublish can't be told from a draft save by status.** In `afterChange` both show `doc._status: 'draft'` and `previousDoc._status: 'published'`, and after a pending draft `previousDoc` is that draft, not the live row. `args.draft` in a `beforeOperation` hook does tell them apart:

     | Request | `args.draft` |
     | --- | --- |
     | publish (create or update) | `undefined` |
     | `?draft=true` save | `true` |
     | admin autosave (`?autosave=true&draft=true`) | `true` |
     | unpublish | `undefined` |

     Without the draft check, every autosave (every 2 seconds) cleared the whole site's cache.
  5. **`next dev` caches `unstable_cache` results across requests**, in `.next/dev/cache/fetch-cache`, and a database change made outside Next is not seen. A browser hard reload (`Cache-Control: no-cache`) bypasses it; an ordinary reload doesn't. The browser tests therefore clear the cache through the running server after seeding (Task 15).
  6. A REST `PATCH` that changes the title without sending `slug` re-derived the slug from the new title, moving the URL. Task 7 fixes this.
  7. `next/font/google` accepts `Literata({ subsets: ['latin', 'latin-ext'], style: ['normal', 'italic'], axes: ['opsz'], display: 'swap', variable: '--font-literata' })` and `Tiro_Devanagari_Sanskrit({ weight: '400', subsets: ['devanagari'], preload: false, display: 'swap' })`.
     - Tiro's `@font-face` rules go in a separate CSS chunk, absent from pages that don't import its module.
     - On a page with Devanagari, its files load, and `document.fonts` reports Tiro faces as `loaded`.
     - `subsets: ['devanagari']` still emits Tiro's Latin rules. A space inside the Devanagari text can pull in that small Latin file.
  8. `next/image` with `images.localPatterns: [{ pathname: '/local-media/**' }]` loads `/local-media/<file>` through `/_next/image` (status 200) under dev and start. A path outside the pattern gets 400.
  9. **Live preview.** `@payloadcms/live-preview-react@3.90.2` installs cleanly, and `generate:importmap` finds nothing new.
     - **Selectors:** the admin's toggle is `getByRole('button', { name: 'Live Preview' })` and the preview is `page.frameLocator('iframe')`. Typing in `getByRole('textbox', { name: 'Title *' })` autosaves, and the iframe showed the new title after about 2.7 s through `RefreshRouteOnSave`.
     - **Who sees it:** an anonymous request to the preview route got 404.
  10. On Windows, stopping a background `next dev` can leave its child process holding the port. Check with `netstat -ano | findstr :3100` and end the process if a later run can't start.
- **Shell.** Commands use Git Bash syntax. Run them from `website/` unless a step says otherwise.
- **Docker Desktop must be running**, then run `npm run db:up`.
- **Stale local test database.** If an integration test run stops at a schema-push prompt because your local test database carries tables from another branch, run `npm run db:reset`. That wipes both local databases.
- **Owner-only steps** are marked **[OWNER]**. Don't perform them without the owner's go-ahead.
- **Commit messages** use the repository's conventional format (`feat:`, `fix:`, `test:`, `chore:`, `docs:`), with no attribution trailer.
- **Before every commit that contains code,** run `npm run lint && npm run typecheck`, plus the tests named in the task.
- **Generated files.** After a task changes a collection, run `npm run generate:types`. After it changes admin components or admin settings, run `npm run generate:importmap`. Commit what they write: `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js`.
- **Interface wording.** Headings such as "Before you read" and "More from …" are placeholders for the owner to approve (spec 9). Don't invent other copy, translations or attributions. Test content says it is test content.

## File map

| Path | Responsibility |
| --- | --- |
| `src/lib/env.ts` | Adds `SITE_URL` and `SITE_INDEXING`; exports `isLocalDatabase` |
| `src/lib/site/config.ts` | `siteConfig()`: the site's address and whether it may be indexed |
| `src/collections/articles/options.ts` | `ARTICLE_SHAPES` and `SOURCE_TYPES`, moved out of `Articles.ts` so public code can import them without the collection |
| `src/lib/site/contrast.ts` | WCAG contrast ratio |
| `src/styles/tokens.ts`, `src/styles/tokens.css` | The colour tokens of both themes, and the text pairs that must reach 4.5:1 |
| `src/styles/global.css` | Base typography, layout widths, focus states, the skip link |
| `src/styles/fonts.ts` | Literata through `next/font` |
| `src/lib/site/types.ts` | The public shapes pages render: cards, article and page views, images, chrome |
| `src/lib/site/format.ts` | Dates in UTC, reading time, shape labels, paragraphs |
| `src/lib/site/links.ts` | `safeHref`: which addresses may become links |
| `src/lib/site/share.ts` | WhatsApp, email and X share links |
| `src/lib/site/params.ts` | `isSlug` for route parameters |
| `src/lib/site/preview-path.ts` | Preview URLs and the live preview's device sizes |
| `src/lib/site/sources.ts` | Sources grouped in the handbook's tier order |
| `src/lib/site/cover.ts` | The generated cover's tint and term |
| `src/lib/site/progress.ts` | Reading progress from the body's position |
| `src/lib/site/theme.ts` | The theme's storage key and the inline script that applies it before the first paint |
| `src/lib/site/local-media.ts` | Local image names and image addresses |
| `src/collections/shared/slug.ts` | `deriveSlug` keeps the stored slug when an edit leaves it out |
| `src/app/(frontend)/local-media/[file]/route.ts` | Serves uploads while storage is off |
| `src/collections/shared/publishing.ts` | Adds `markDraftSave` and `isDraftSave` |
| `src/lib/site/refresh.ts` | `SITE_TAG` and `refreshSite()` |
| `src/collections/shared/refresh.ts` | The hooks that refresh pages after published content changes |
| `src/lib/site/body.ts` | What a body references, link addresses, body images |
| `src/lib/site/lookups.ts` | Batched reads: topics, level names, published link targets, public images |
| `src/lib/site/articles.ts` | Article cards and views, the published article by slug, related articles |
| `src/lib/site/pages.ts` | Page views |
| `src/lib/site/chrome.ts` | Tagline, footer motto and navigation from site settings |
| `src/lib/site/preview.ts` | The latest draft of an article or page, for staff |
| `src/lib/site/cached.ts` | The cached reads the public routes call |
| `src/lib/site/metadata.ts` | An article's title, description, canonical address and link preview |
| `src/components/site/*` | Header, footer, theme toggle |
| `src/components/rich-text/*` | The body renderer and the Verse, Tradition and Practice blocks |
| `src/components/article/*` | The article page's parts, the cover and the article card |
| `src/components/page/PageView.tsx` | A page's title and body (stage 3b reuses it) |
| `src/components/preview/LivePreviewRefresh.tsx` | Reloads a preview after each autosave |
| `src/app/(frontend)/layout.tsx` | Fonts, theme script, header, footer, site metadata |
| `src/app/(frontend)/articles/[slug]/page.tsx` | The article page |
| `src/app/(frontend)/preview/articles/[id]/page.tsx`, `.../preview/pages/[id]/page.tsx` | Live preview |
| `src/collections/articles/Articles.ts`, `src/collections/Pages.ts`, `Topics.ts`, `DifficultyLevels.ts`, `Media.ts`, `src/globals/SiteSettings.ts` | Refresh hooks, the draft flag, live preview settings |
| `next.config.ts` | Image settings |
| `vitest.config.mts` | Leaves `cached.ts` out of unit coverage |
| `tests/helpers/lexical.ts` | Adds Tradition, Practice and link nodes |
| `tests/helpers/site.ts` | An article-view fixture |
| `tests/unit/*.unit.spec.ts`, `tests/int/*.int.spec.ts` | Tests, per task |
| `tests/e2e/server.ts`, `sign-in.ts`, `seed-reading.ts`, `global-setup.ts`, `reset-database.ts`, `*.e2e.spec.ts` | Browser tests, the content they read, and clearing the dev cache after seeding |
| `.github/workflows/website-ci.yml` | Uploads the browser tests' screenshots |
| `.env.example`, `docs/environments.md`, `docs/specs/2026-10-05-sagevani-website-design.md` | New variables and routes |
| `CHANGELOG.md`, `docs/operations/tasks.md` (repository root) | Records |

---

### Task 1: Dependencies

**Files:**
- Modify: `website/package.json`, `website/package-lock.json`

- [ ] **Step 1: Install live preview at Payload's exact version, and axe for the browser tests**

```bash
npm install --save-exact @payloadcms/live-preview-react@3.90.2
npm install --save-dev --save-exact @axe-core/playwright@4.13.0
grep -n '"@payloadcms/live-preview-react"\|"@axe-core/playwright"' package.json
```

Expected: `"@payloadcms/live-preview-react": "3.90.2",` under `dependencies` and `"@axe-core/playwright": "4.13.0",` under `devDependencies`. 4.13.0 is the latest stable release (2026-08-11); the newer tags are pre-releases.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add live preview and axe"
```

---

### Task 2: The site's address and indexing

The site needs its own address for canonical links, link previews and share links, and stays out of search engines until launch (spec 4.6). `SITE_URL` is checked when a page renders, not at startup, so the owner's scripts against staging and production (`owner:create`, migrations) don't need it.

**Files:**
- Modify: `src/lib/env.ts`, `tests/unit/env.unit.spec.ts`, `.env.example`
- Create: `src/lib/site/config.ts`, `tests/unit/site-config.unit.spec.ts`

- [ ] **Step 1: Write the failing tests.** Append to `tests/unit/env.unit.spec.ts`:

```ts
describe('site address and indexing', () => {
  it('needs neither', () => {
    const env = parseServerEnv(VALID)
    expect(env.SITE_URL).toBeUndefined()
    expect(env.SITE_INDEXING).toBeUndefined()
  })

  it('accepts an origin and drops trailing slashes', () => {
    expect(parseServerEnv({ ...VALID, SITE_URL: 'https://sagevani.example//' }).SITE_URL).toBe(
      'https://sagevani.example',
    )
    expect(parseServerEnv({ ...VALID, SITE_URL: 'http://localhost:3000' }).SITE_URL).toBe(
      'http://localhost:3000',
    )
  })

  it('refuses a path, a query, or a scheme other than http and https', () => {
    for (const value of [
      'https://sagevani.example/blog',
      'https://sagevani.example?x=1',
      'ftp://sagevani.example',
      'sagevani.example',
    ]) {
      expect(() => parseServerEnv({ ...VALID, SITE_URL: value })).toThrowError(
        /SITE_URL: must be an http:\/\/ or https:\/\/ address with no path/,
      )
    }
  })

  it('accepts on or off for indexing, and nothing else', () => {
    expect(parseServerEnv({ ...VALID, SITE_INDEXING: 'on' }).SITE_INDEXING).toBe('on')
    expect(parseServerEnv({ ...VALID, SITE_INDEXING: ' off ' }).SITE_INDEXING).toBe('off')
    expect(() => parseServerEnv({ ...VALID, SITE_INDEXING: 'true' })).toThrowError(
      /SITE_INDEXING: must be on or off/,
    )
  })

  it('treats empty values as absent', () => {
    const env = parseServerEnv({ ...VALID, SITE_URL: ' ', SITE_INDEXING: '' })
    expect(env.SITE_URL).toBeUndefined()
    expect(env.SITE_INDEXING).toBeUndefined()
  })
})
```

Create `tests/unit/site-config.unit.spec.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LOCAL_SITE_URL, siteConfig, siteConfigFrom } from '@/lib/site/config'

const LOCAL_DATABASE = 'postgres://postgres:postgres@127.0.0.1:54329/sagevani'
const REMOTE_DATABASE = 'postgres://u:p@aws-0-us-east-2.pooler.supabase.com:6543/postgres'

describe('siteConfigFrom', () => {
  it('uses the local address and stays unindexed with nothing set', () => {
    expect(siteConfigFrom({ DATABASE_URL: LOCAL_DATABASE })).toEqual({
      url: LOCAL_SITE_URL,
      indexing: false,
    })
  })

  it('requires SITE_URL for a database that is not local', () => {
    expect(() => siteConfigFrom({ DATABASE_URL: REMOTE_DATABASE })).toThrowError(
      'SITE_URL is required for a database that is not local.',
    )
  })

  it('uses SITE_URL when it is set', () => {
    expect(
      siteConfigFrom({ DATABASE_URL: REMOTE_DATABASE, SITE_URL: 'https://sagevani.example' }).url,
    ).toBe('https://sagevani.example')
  })

  it('allows indexing only when SITE_INDEXING is on', () => {
    expect(siteConfigFrom({ DATABASE_URL: LOCAL_DATABASE, SITE_INDEXING: 'on' }).indexing).toBe(
      true,
    )
    expect(siteConfigFrom({ DATABASE_URL: LOCAL_DATABASE, SITE_INDEXING: 'off' }).indexing).toBe(
      false,
    )
  })
})

describe('siteConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('reads this process environment', () => {
    vi.stubEnv('SITE_INDEXING', 'on')
    expect(siteConfig().indexing).toBe(true)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/unit/env.unit.spec.ts tests/unit/site-config.unit.spec.ts`
Expected: FAIL. `SITE_URL` is passed through as unknown, and `@/lib/site/config` does not exist.

- [ ] **Step 3: Add the variables.** In `src/lib/env.ts`, export the local-database check:

```ts
export const isLocalDatabase = (databaseUrl: string): boolean => {
```

(replacing `const isLocalDatabase = (databaseUrl: string): boolean => {`). Below the `PUBLIC_URL` constant add:

```ts
// The site's own address (stage 3 design, 4.6): an origin, because paths are appended to it.
const SITE_ORIGIN = z
  .string()
  .regex(
    /^https?:\/\/[^\s/?#]+$/,
    'must be an http:// or https:// address with no path, such as https://example.org',
  )
```

and inside `z.object({ … })`, after `MEDIA_PUBLIC_URL`:

```ts
    // Required on hosted sites, checked when a page renders (src/lib/site/config.ts), so the
    // owner's scripts against staging and production don't need it.
    SITE_URL: z.preprocess(withoutTrailingSlashes, SITE_ORIGIN.optional()),
    // Search engines may index the site only once this is "on", at launch.
    SITE_INDEXING: z.preprocess(
      optionalText,
      z.enum(['on', 'off'], { error: 'must be on or off' }).optional(),
    ),
```

- [ ] **Step 4: Create `src/lib/site/config.ts`**

```ts
import { isLocalDatabase, parseServerEnv, type ServerEnv } from '../env'

/** The address used when the site runs against the local database. */
export const LOCAL_SITE_URL = 'http://localhost:3000'

export interface SiteConfig {
  /** The site's origin, without a trailing slash: canonical links, link previews, share links. */
  url: string
  /** Whether search engines may index the site. Off until launch (stage 3 design, 4.6). */
  indexing: boolean
}

type SiteEnv = Pick<ServerEnv, 'DATABASE_URL'> & Partial<Pick<ServerEnv, 'SITE_URL' | 'SITE_INDEXING'>>

export function siteConfigFrom(env: SiteEnv): SiteConfig {
  if (!env.SITE_URL && !isLocalDatabase(env.DATABASE_URL)) {
    throw new Error('SITE_URL is required for a database that is not local.')
  }
  return { url: env.SITE_URL ?? LOCAL_SITE_URL, indexing: env.SITE_INDEXING === 'on' }
}

/** This process's site settings. Static pages read them during the build, so a missing SITE_URL fails the deploy. */
export function siteConfig(): SiteConfig {
  return siteConfigFrom(parseServerEnv(process.env))
}
```

- [ ] **Step 5: Document the variables.** Append to `.env.example`:

```bash

# The site's own address, used in canonical links, link previews and share links. Leave empty
# locally (http://localhost:3000 is used). Required for any database that is not local.
SITE_URL=

# Search engines may index the site only when this is "on". Leave it off until launch.
SITE_INDEXING=
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run tests/unit/env.unit.spec.ts tests/unit/site-config.unit.spec.ts`
Expected: PASS, including every existing `parseServerEnv` test.

- [ ] **Step 7: Commit**

```bash
npm run lint && npm run typecheck
git add src/lib/env.ts src/lib/site/config.ts tests/unit/env.unit.spec.ts tests/unit/site-config.unit.spec.ts .env.example
git commit -m "feat: the site's address and its indexing switch"
```

---

### Task 3: Shared article options

Public code needs the shape labels and the source types. Importing them from `Articles.ts` would pull the collection, its hooks and `next/cache` into every page module, so they move to their own file.

**Files:**
- Create: `src/collections/articles/options.ts`
- Modify: `src/collections/articles/Articles.ts`

- [ ] **Step 1: Create `src/collections/articles/options.ts`** with the two arrays moved verbatim from `Articles.ts`:

```ts
/** The four shapes of a piece (handbook 05, content architecture). */
export const ARTICLE_SHAPES = [
  { label: 'Vani Note', value: 'vani-note' },
  { label: 'Inquiry Essay', value: 'inquiry-essay' },
  { label: 'Text / Story Study', value: 'text-story-study' },
  { label: 'Practice Journal', value: 'practice-journal' },
]

/** Source types in the handbook's tier order (03 Editorial integrity, source hierarchy). */
export const SOURCE_TYPES = [
  { label: 'Primary text', value: 'primary-text' },
  { label: 'Commentary', value: 'commentary' },
  { label: 'Academic', value: 'academic' },
  { label: 'Living tradition', value: 'living-tradition' },
  { label: 'General', value: 'general' },
]
```

- [ ] **Step 2: Use them in `Articles.ts`.** Delete the two `export const` blocks from `src/collections/articles/Articles.ts` and add to its imports:

```ts
import { ARTICLE_SHAPES, SOURCE_TYPES } from './options'
```

- [ ] **Step 3: Check nothing else imported them from `Articles.ts`**

Run: `grep -rn "ARTICLE_SHAPES\|SOURCE_TYPES" src tests`
Expected: only `options.ts` and the two uses in `Articles.ts`.

- [ ] **Step 4: Run the article tests and commit**

```bash
npm run lint && npm run typecheck
npx vitest run tests/int/articles-fields.int.spec.ts
git add src/collections/articles/options.ts src/collections/articles/Articles.ts
git commit -m "refactor: article shapes and source types in their own module"
```

Expected: PASS.

---

### Task 4: Colour tokens

The colours of parent spec 7.1 in both themes, checked for contrast (spec 5.1). A check run while writing this plan found every text pair passing in both themes, the parent spec's dark proposals included (lowest: muted on paper-2 in light, 5.07:1). The accent on the footer's ink background is only 2.16:1 in light, so the footer never uses the accent for text.

**Files:**
- Create: `src/lib/site/contrast.ts`, `src/styles/tokens.ts`, `src/styles/tokens.css`, `tests/unit/contrast.unit.spec.ts`, `tests/unit/tokens.unit.spec.ts`

- [ ] **Step 1: Write the failing tests.** Create `tests/unit/contrast.unit.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { contrastRatio, relativeLuminance } from '@/lib/site/contrast'

describe('contrastRatio', () => {
  it('is 21 for black on white, in either order', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5)
  })

  it('is 1 for a colour on itself', () => {
    expect(contrastRatio('#9a3b26', '#9a3b26')).toBe(1)
  })

  it('matches the ratio the website design measured for ink on paper', () => {
    expect(contrastRatio('#2b2621', '#f4efe4')).toBeCloseTo(13.06, 2)
  })

  it('accepts upper-case hex', () => {
    expect(relativeLuminance('#FFFFFF')).toBe(1)
  })

  it('refuses anything but six-digit hex', () => {
    expect(() => relativeLuminance('#fff')).toThrowError('Not a six-digit hex colour: #fff')
    expect(() => relativeLuminance('red')).toThrowError('Not a six-digit hex colour: red')
  })
})
```

Create `tests/unit/tokens.unit.spec.ts`:

```ts
import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { contrastRatio } from '@/lib/site/contrast'
import { TEXT_PAIRS, THEMES } from '@/styles/tokens'

const AA = 4.5
const css = readFileSync(path.resolve('src/styles/tokens.css'), 'utf8')

/** The colour declarations in the first rule whose selector is exactly `selector`. */
function declarations(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`tokens.css has no rule for ${selector}`)
  const open = css.indexOf('{', start)
  const body = css.slice(open + 1, css.indexOf('}', open))
  return Object.fromEntries(
    [...body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, name, value]) => [
      name,
      value.toLowerCase(),
    ]),
  )
}

describe('colour tokens', () => {
  for (const [theme, colours] of Object.entries(THEMES)) {
    for (const [text, background] of TEXT_PAIRS) {
      it(`${theme}: ${text} on ${background} reaches ${AA}:1`, () => {
        expect(contrastRatio(colours[text], colours[background])).toBeGreaterThanOrEqual(AA)
      })
    }
  }

  it('tokens.css declares the light theme on :root', () => {
    expect(declarations(':root')).toEqual(THEMES.light)
  })

  it('tokens.css declares the dark theme for the device setting and for the reader’s choice', () => {
    expect(declarations(":root:not([data-theme='light'])")).toEqual(THEMES.dark)
    expect(declarations(":root[data-theme='dark']")).toEqual(THEMES.dark)
  })
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/unit/contrast.unit.spec.ts tests/unit/tokens.unit.spec.ts`
Expected: FAIL: the modules don't exist.

- [ ] **Step 3: Create `src/lib/site/contrast.ts`**

```ts
const HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i

const linear = (channel: number): number => {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

/** WCAG 2 relative luminance of a six-digit hex colour. */
export function relativeLuminance(hex: string): number {
  const match = HEX.exec(hex)
  if (!match) throw new Error(`Not a six-digit hex colour: ${hex}`)
  const [red, green, blue] = match.slice(1).map((part) => linear(parseInt(part, 16)))
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** WCAG 2 contrast ratio between two colours, from 1 to 21. */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  )
  return (lighter + 0.05) / (darker + 0.05)
}
```

- [ ] **Step 4: Create `src/styles/tokens.ts`**

```ts
/**
 * The site's colours (website design 7.1). tokens.css declares the same values, and
 * tests/unit/tokens.unit.spec.ts checks that the two agree and that every text pair reaches 4.5:1.
 */
export const THEMES = {
  light: {
    paper: '#f4efe4',
    'paper-2': '#ece5d6',
    surface: '#f8f4ea',
    ink: '#2b2621',
    'ink-soft': '#4a433b',
    muted: '#675e53',
    rule: '#d9cfbd',
    accent: '#9a3b26',
    'on-accent': '#fbf7ef',
    footer: '#2b2621',
    'footer-text': '#d6cdbc',
  },
  dark: {
    paper: '#1a1714',
    'paper-2': '#221e1a',
    surface: '#201c18',
    ink: '#ebe3d3',
    'ink-soft': '#c6bdad',
    muted: '#a39a8b',
    rule: '#352f28',
    accent: '#e0896c',
    'on-accent': '#1a1714',
    footer: '#2b2621',
    'footer-text': '#d6cdbc',
  },
} as const

export type ColourToken = keyof (typeof THEMES)['light']

/**
 * Every text colour with each background it is used on. The footer uses only footer-text: the
 * accent on the footer's ink is 2.16:1 in the light theme.
 */
export const TEXT_PAIRS: readonly (readonly [ColourToken, ColourToken])[] = [
  ['ink', 'paper'],
  ['ink', 'paper-2'],
  ['ink', 'surface'],
  ['ink-soft', 'paper'],
  ['ink-soft', 'paper-2'],
  ['ink-soft', 'surface'],
  ['muted', 'paper'],
  ['muted', 'paper-2'],
  ['muted', 'surface'],
  ['accent', 'paper'],
  ['accent', 'paper-2'],
  ['accent', 'surface'],
  ['on-accent', 'accent'],
  ['footer-text', 'footer'],
]
```

- [ ] **Step 5: Create `src/styles/tokens.css`.** The light block must come first: the test reads the first `:root {` rule.

```css
/*
 * The site's colours (website design 7.1). src/styles/tokens.ts holds the same values, and
 * tests/unit/tokens.unit.spec.ts checks that both agree and that every text pair reaches 4.5:1.
 * The light theme is the default; the dark one follows the device unless the reader chose light,
 * or applies when the reader chose dark (data-theme on <html>, set before the first paint).
 */
:root {
  color-scheme: light;
  --paper: #f4efe4;
  --paper-2: #ece5d6;
  --surface: #f8f4ea;
  --ink: #2b2621;
  --ink-soft: #4a433b;
  --muted: #675e53;
  --rule: #d9cfbd;
  --accent: #9a3b26;
  --on-accent: #fbf7ef;
  --footer: #2b2621;
  --footer-text: #d6cdbc;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;
    --paper: #1a1714;
    --paper-2: #221e1a;
    --surface: #201c18;
    --ink: #ebe3d3;
    --ink-soft: #c6bdad;
    --muted: #a39a8b;
    --rule: #352f28;
    --accent: #e0896c;
    --on-accent: #1a1714;
    --footer: #2b2621;
    --footer-text: #d6cdbc;
  }
}

:root[data-theme='dark'] {
  color-scheme: dark;
  --paper: #1a1714;
  --paper-2: #221e1a;
  --surface: #201c18;
  --ink: #ebe3d3;
  --ink-soft: #c6bdad;
  --muted: #a39a8b;
  --rule: #352f28;
  --accent: #e0896c;
  --on-accent: #1a1714;
  --footer: #2b2621;
  --footer-text: #d6cdbc;
}

/* Sizes and type (website design 7.2 and 7.3). */
:root {
  --font-body: var(--font-literata), Georgia, 'Times New Roman', serif;
  --page: 1120px;
  --column: 680px;
  --gutter: clamp(16px, 4vw, 28px);
  --header-height: 64px;
  --text-body: 19px;
  --text-ui: 15px;
  --text-small: 13px;
  --text-label: 11px;
  --leading-body: 1.7;
}

@media (max-width: 859px) {
  :root {
    --header-height: 56px;
    --text-body: 18px;
  }
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run tests/unit/contrast.unit.spec.ts tests/unit/tokens.unit.spec.ts && npm run format:check`
Expected: PASS: 28 contrast checks plus the two declaration checks. If Prettier rewrites `tokens.css`, run `npx prettier --write src/styles/tokens.css` and rerun the test: the selectors the test searches for must survive formatting.

- [ ] **Step 7: Commit**

```bash
npm run lint && npm run typecheck
git add src/lib/site/contrast.ts src/styles/tokens.ts src/styles/tokens.css tests/unit/contrast.unit.spec.ts tests/unit/tokens.unit.spec.ts
git commit -m "feat: colour tokens for both themes, checked for contrast"
```

---

### Task 5: Public types and presentation helpers

Small pure functions the components use (spec 4.2, 5.5, 5.6, 6.1). Each has unit tests.

**Files:**
- Create: `src/lib/site/types.ts`, `format.ts`, `links.ts`, `share.ts`, `params.ts`, `preview-path.ts`, `sources.ts`, `cover.ts`, `progress.ts`, `theme.ts`
- Create: `tests/unit/site-format.unit.spec.ts`, `tests/unit/site-links.unit.spec.ts`, `tests/unit/site-sources.unit.spec.ts`, `tests/unit/site-cover.unit.spec.ts`, `tests/unit/site-theme.unit.spec.ts`

- [ ] **Step 1: Create `src/lib/site/types.ts`** (types only; later tasks fill them)

```ts
import type { Article } from '../../payload-types'
import type { SourceGroup } from './sources'

/** Serialized editor content, as Payload stores it. */
export type RichTextValue = NonNullable<Article['body']>

/** An image a public page may show: only these four fields ever leave the media collection. */
export interface PublicImage {
  url: string
  alt: string
  width: number
  height: number
}

export interface Tint {
  background: string
  text: string
}

export interface TopicRef {
  id: number
  name: string
  slug: string
  question: string
  tint: Tint
}

export interface CoverData {
  /** The large word: the cover term, or the title when there is none. */
  term: string
  title: string
  background: string
  text: string
  /** A cover photo replaces the drawn cover. */
  photo: PublicImage | null
}

export interface ArticleCard {
  id: number
  slug: string
  title: string
  summary: string | null
  /** The shape's label, such as "Inquiry Essay". */
  shapeLabel: string | null
  /** In the article's own order: the first gives the cover tint and "More from". */
  topics: TopicRef[]
  difficulty: string | null
  readingTime: number | null
  publishedAt: string | null
  cover: CoverData
}

export interface PriorReading {
  title: string
  href: string | null
  author: string | null
  reason: string | null
}

export interface PublicCorrection {
  date: string
  change: string
}

/**
 * What the body renderer needs beyond the content: its images by id, and its link targets by
 * `relationTo:id`. Plain objects, so the cache can store them.
 */
export interface BodyContext {
  images: Record<string, PublicImage>
  links: Record<string, string>
}

export interface ArticleView extends ArticleCard {
  background: string | null
  readFirst: PriorReading[]
  body: RichTextValue | null
  bodyContext: BodyContext
  sources: SourceGroup[]
  corrections: PublicCorrection[]
  seo: { title: string | null; description: string | null }
}

export interface PageView {
  id: number
  slug: string
  title: string
  body: RichTextValue | null
  bodyContext: BodyContext
}

export interface NavigationLink {
  label: string
  path: string
}

export interface SiteChrome {
  tagline: string
  footerMotto: string | null
  navigation: NavigationLink[]
}

/** Shown for a draft that has no title yet (preview only: published articles always have one). */
export const UNTITLED = 'Untitled'
```

- [ ] **Step 2: Write the failing tests.** Create `tests/unit/site-format.unit.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { formatDate, paragraphsOf, readingTimeLabel, shapeLabel } from '@/lib/site/format'
import { isSlug } from '@/lib/site/params'
import { PREVIEW_BREAKPOINTS, previewPath } from '@/lib/site/preview-path'
import { readingProgress } from '@/lib/site/progress'

describe('formatDate', () => {
  it('writes the day, the month in full and the year', () => {
    expect(formatDate('2026-10-11T09:30:00.000Z')).toBe('11 October 2026')
  })

  it('uses UTC, so a late-evening date never moves to the next day', () => {
    expect(formatDate('2026-10-11T23:59:59.000Z')).toBe('11 October 2026')
    expect(formatDate('2026-10-12T00:00:00.000Z')).toBe('12 October 2026')
  })

  it('gives null for nothing or for a value that is not a date', () => {
    expect(formatDate(null)).toBeNull()
    expect(formatDate(undefined)).toBeNull()
    expect(formatDate('not a date')).toBeNull()
  })
})

describe('labels', () => {
  it('writes reading time in minutes', () => {
    expect(readingTimeLabel(7)).toBe('7 min read')
  })

  it('names each shape, and gives null for an unknown one', () => {
    expect(shapeLabel('inquiry-essay')).toBe('Inquiry Essay')
    expect(shapeLabel('text-story-study')).toBe('Text / Story Study')
    expect(shapeLabel('poem')).toBeNull()
    expect(shapeLabel(null)).toBeNull()
  })
})

describe('paragraphsOf', () => {
  it('splits at blank lines and trims each paragraph', () => {
    expect(paragraphsOf('First line\nsame paragraph\n\n  Second  \r\n\r\nThird')).toEqual([
      'First line\nsame paragraph',
      'Second',
      'Third',
    ])
  })

  it('gives nothing for empty text', () => {
    expect(paragraphsOf('  \n\n ')).toEqual([])
    expect(paragraphsOf(null)).toEqual([])
  })
})

describe('isSlug', () => {
  it('accepts the slugs the site makes', () => {
    expect(isSlug('maya-and-the-rope')).toBe(true)
    expect(isSlug('gita-2-47')).toBe(true)
  })

  it('refuses anything else', () => {
    for (const value of ['', 'Maya', 'maya--rope', '-maya', 'maya-', 'māyā', 'a/b', 'x'.repeat(201)]) {
      expect(isSlug(value)).toBe(false)
    }
  })
})

describe('previewPath', () => {
  it('points at the preview route for a saved document', () => {
    expect(previewPath('articles', 12)).toBe('/preview/articles/12')
    expect(previewPath('pages', '7')).toBe('/preview/pages/7')
  })

  it('gives null before the document has an id, or for a malformed one', () => {
    expect(previewPath('articles', undefined)).toBeNull()
    expect(previewPath('articles', '1;drop')).toBeNull()
  })

  it('offers phone, tablet and desktop sizes', () => {
    expect(PREVIEW_BREAKPOINTS.map(({ width }) => width)).toEqual([375, 768, 1440])
  })
})

describe('readingProgress', () => {
  it('is 0 before the body reaches the top of the window, and 1 at its end', () => {
    expect(readingProgress(200, 3000, 800)).toBe(0)
    expect(readingProgress(-2200, 3000, 800)).toBe(1)
  })

  it('is the share of the scrollable length read so far', () => {
    expect(readingProgress(-1100, 3000, 800)).toBeCloseTo(0.5)
  })

  it('never leaves 0 to 1', () => {
    expect(readingProgress(-5000, 3000, 800)).toBe(1)
  })

  it('is 1 when the whole body fits in the window', () => {
    expect(readingProgress(100, 500, 800)).toBe(1)
  })
})
```

Create `tests/unit/site-links.unit.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { safeHref } from '@/lib/site/links'
import { shareLinks } from '@/lib/site/share'

describe('safeHref', () => {
  it('keeps paths on this site and http, https and mailto addresses', () => {
    for (const value of [
      '/articles/maya',
      '/',
      'https://example.org/a?b=c#d',
      'http://example.org',
      'mailto:someone@example.org',
    ]) {
      expect(safeHref(value)).toBe(value)
    }
  })

  it('trims surrounding whitespace', () => {
    expect(safeHref('  https://example.org  ')).toBe('https://example.org')
  })

  it('refuses scripts, data, other schemes and paths that leave the site', () => {
    for (const value of [
      'javascript:alert(1)',
      ' JavaScript:alert(1)',
      'java\tscript:alert(1)',
      'data:text/html,<p>x</p>',
      'ftp://example.org',
      '//evil.example',
      '/\\evil.example',
      'relative/path',
      '',
    ]) {
      expect(safeHref(value)).toBeNull()
    }
  })

  it('refuses anything that is not a string', () => {
    expect(safeHref(undefined)).toBeNull()
    expect(safeHref(null)).toBeNull()
    expect(safeHref(42)).toBeNull()
  })
})

describe('shareLinks', () => {
  const links = shareLinks('https://sagevani.example/articles/maya', 'Māyā & the rope')

  it('shares on WhatsApp with the title and the address in one message', () => {
    expect(links.whatsapp).toBe(
      'https://wa.me/?text=M%C4%81y%C4%81%20%26%20the%20rope%20https%3A%2F%2Fsagevani.example%2Farticles%2Fmaya',
    )
  })

  it('shares by email with the title as the subject', () => {
    expect(links.email).toBe(
      'mailto:?subject=M%C4%81y%C4%81%20%26%20the%20rope&body=https%3A%2F%2Fsagevani.example%2Farticles%2Fmaya',
    )
  })

  it('shares on X with the title and the address', () => {
    expect(links.x).toBe(
      'https://x.com/intent/post?text=M%C4%81y%C4%81%20%26%20the%20rope&url=https%3A%2F%2Fsagevani.example%2Farticles%2Fmaya',
    )
  })
})
```

Create `tests/unit/site-sources.unit.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { groupSources } from '@/lib/site/sources'

describe('groupSources', () => {
  it('groups in the handbook’s tier order and leaves out empty groups', () => {
    const groups = groupSources([
      { type: 'academic', work: 'A study' },
      { type: 'primary-text', work: 'Bhagavad Gītā' },
      { type: 'academic', work: 'Another study' },
    ])
    expect(groups.map(({ label, entries }) => [label, entries.map(({ work }) => work)])).toEqual([
      ['Primary text', ['Bhagavad Gītā']],
      ['Academic', ['A study', 'Another study']],
    ])
  })

  it('trims fields, drops blank ones, formats the access date and keeps only safe links', () => {
    const [group] = groupSources([
      {
        type: 'commentary',
        work: ' Gītā Bhāṣya ',
        author: ' Śaṅkara ',
        edition: '  ',
        location: '2.47',
        url: 'javascript:alert(1)',
        accessedOn: '2026-10-03T00:00:00.000Z',
        claim: 'How this school reads the verse.',
      },
    ])
    expect(group.entries[0]).toEqual({
      work: 'Gītā Bhāṣya',
      author: 'Śaṅkara',
      edition: null,
      location: '2.47',
      href: null,
      accessedOn: '3 October 2026',
      claim: 'How this school reads the verse.',
    })
  })

  it('gives nothing for no sources, and drops a source of an unknown type', () => {
    expect(groupSources(null)).toEqual([])
    expect(groupSources([{ type: 'rumour', work: 'Hearsay' }])).toEqual([])
  })
})
```

Create `tests/unit/site-cover.unit.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { coverFor, NO_TOPIC_TINT } from '@/lib/site/cover'

const DHARMA = { tint: { background: '#e3cfa8', text: '#3d2f1c' } }

describe('coverFor', () => {
  it('draws the cover term in the first topic’s tint', () => {
    expect(
      coverFor({ title: 'A title', coverTerm: ' dharma ', firstTopic: DHARMA, photo: null }),
    ).toEqual({
      term: 'dharma',
      title: 'A title',
      background: '#e3cfa8',
      text: '#3d2f1c',
      photo: null,
    })
  })

  it('falls back to the title when there is no cover term', () => {
    expect(coverFor({ title: 'A title', coverTerm: '  ', firstTopic: DHARMA, photo: null }).term).toBe(
      'A title',
    )
  })

  it('uses the no-topic tint for an article without a topic', () => {
    const cover = coverFor({ title: 'A title', firstTopic: null, photo: null })
    expect([cover.background, cover.text]).toEqual([NO_TOPIC_TINT.background, NO_TOPIC_TINT.text])
  })

  it('keeps the photo, which replaces the drawn cover', () => {
    const photo = { url: '/local-media/x.png', alt: 'A lamp', width: 1200, height: 630 }
    expect(coverFor({ title: 'A title', firstTopic: null, photo }).photo).toBe(photo)
  })
})
```

Create `tests/unit/site-theme.unit.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { isTheme, otherTheme, THEME_SCRIPT, THEME_STORAGE_KEY } from '@/lib/site/theme'

/** Runs the inline script against a stand-in document and storage; returns data-theme. */
function runScript(stored: string | null, storageThrows = false): string | undefined {
  const root = { dataset: {} as Record<string, string> }
  const storage = {
    getItem: (key: string) => {
      if (storageThrows) throw new Error('storage blocked')
      return key === THEME_STORAGE_KEY ? stored : null
    },
  }
  new Function('localStorage', 'document', THEME_SCRIPT)(storage, { documentElement: root })
  return root.dataset.theme
}

describe('the theme script', () => {
  it('applies a stored choice', () => {
    expect(runScript('dark')).toBe('dark')
    expect(runScript('light')).toBe('light')
  })

  it('leaves the device setting in charge when nothing valid is stored', () => {
    expect(runScript(null)).toBeUndefined()
    expect(runScript('sepia')).toBeUndefined()
  })

  it('never throws when storage is blocked', () => {
    expect(runScript('dark', true)).toBeUndefined()
  })
})

describe('theme helpers', () => {
  it('recognises the two themes only', () => {
    expect(isTheme('light')).toBe(true)
    expect(isTheme('dark')).toBe(true)
    expect(isTheme('system')).toBe(false)
  })

  it('switches between them', () => {
    expect(otherTheme('light')).toBe('dark')
    expect(otherTheme('dark')).toBe('light')
  })
})
```

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run tests/unit/site-format.unit.spec.ts tests/unit/site-links.unit.spec.ts tests/unit/site-sources.unit.spec.ts tests/unit/site-cover.unit.spec.ts tests/unit/site-theme.unit.spec.ts`
Expected: FAIL: the modules don't exist.

- [ ] **Step 4: Create `src/lib/site/format.ts`**

```ts
import { ARTICLE_SHAPES } from '../../collections/articles/options'

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "11 October 2026", in UTC so a date never shifts with the server's location (stage 3 design, 5.6). */
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : DATE_FORMAT.format(date)
}

export const readingTimeLabel = (minutes: number): string => `${minutes} min read`

/** The shape's label, such as "Inquiry Essay"; null for an unknown or missing shape. */
export function shapeLabel(value: string | null | undefined): string | null {
  return ARTICLE_SHAPES.find((shape) => shape.value === value)?.label ?? null
}

/** Text from a plain textarea, split into paragraphs at blank lines. */
export function paragraphsOf(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\r?\n[^\S\r\n]*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}
```

- [ ] **Step 5: Create `src/lib/site/links.ts`**

```ts
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/**
 * An address that may become a link: a path on this site, or an http, https or mailto address.
 * Anything else, such as javascript: or data:, gives null and is shown as plain text
 * (stage 3 design, 4.2). The URL parser strips tabs and newlines first, so "java\tscript:" is
 * caught too.
 */
export function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const href = value.trim()
  if (/^\/(?![/\\])/.test(href)) return href
  try {
    return ALLOWED_PROTOCOLS.has(new URL(href).protocol) ? href : null
  } catch {
    return null
  }
}
```

- [ ] **Step 6: Create `src/lib/site/share.ts`**

```ts
export interface ShareLinks {
  whatsapp: string
  email: string
  x: string
}

/** Plain share links: none of them needs JavaScript (stage 3 design, 6.1). */
export function shareLinks(url: string, title: string): ShareLinks {
  const address = encodeURIComponent(url)
  const subject = encodeURIComponent(title)
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    email: `mailto:?subject=${subject}&body=${address}`,
    x: `https://x.com/intent/post?text=${subject}&url=${address}`,
  }
}
```

- [ ] **Step 7: Create `src/lib/site/params.ts`**

```ts
/** The longest slug a route accepts. Slugs are made from titles, so real ones are far shorter. */
export const MAX_SLUG_LENGTH = 200

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Whether a route parameter can be a slug (src/lib/slug.ts makes them). Anything else is a 404 before any query. */
export const isSlug = (value: string): boolean =>
  value.length <= MAX_SLUG_LENGTH && SLUG.test(value)
```

- [ ] **Step 8: Create `src/lib/site/preview-path.ts`**

```ts
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
```

- [ ] **Step 9: Create `src/lib/site/sources.ts`**

```ts
import { SOURCE_TYPES } from '../../collections/articles/options'
import { formatDate } from './format'
import { safeHref } from './links'

export interface SourceInput {
  type: string
  work: string
  author?: string | null
  edition?: string | null
  location?: string | null
  url?: string | null
  accessedOn?: string | null
  claim?: string | null
}

export interface SourceEntry {
  work: string
  author: string | null
  edition: string | null
  location: string | null
  href: string | null
  accessedOn: string | null
  claim: string | null
}

export interface SourceGroup {
  type: string
  label: string
  entries: SourceEntry[]
}

const text = (value: string | null | undefined): string | null => value?.trim() || null

const toEntry = (source: SourceInput): SourceEntry => ({
  work: source.work.trim(),
  author: text(source.author),
  edition: text(source.edition),
  location: text(source.location),
  href: safeHref(source.url),
  accessedOn: formatDate(source.accessedOn),
  claim: text(source.claim),
})

/**
 * Sources grouped in the handbook's tier order (03 Editorial integrity), empty groups left out.
 * The way readers see them is a proposal until Q-07 is decided (stage 3 design, 6.1).
 */
export function groupSources(sources: readonly SourceInput[] | null | undefined): SourceGroup[] {
  const list = sources ?? []
  return SOURCE_TYPES.map(({ label, value }) => ({
    type: value,
    label,
    entries: list.filter((source) => source.type === value).map(toEntry),
  })).filter((group) => group.entries.length > 0)
}
```

- [ ] **Step 10: Create `src/lib/site/cover.ts`**

```ts
import type { CoverData, PublicImage, Tint } from './types'

/** The tint of an article with no topic (website design 7.1). */
export const NO_TOPIC_TINT: Tint = { background: '#efe6d2', text: '#2b2621' }

export interface CoverInput {
  title: string
  coverTerm?: string | null
  /** The article's first topic, in its own order. */
  firstTopic: { tint: Tint } | null
  photo: PublicImage | null
}

/** The generated cover, design A (stage 3 design, 5.5). */
export function coverFor({ title, coverTerm, firstTopic, photo }: CoverInput): CoverData {
  const tint = firstTopic?.tint ?? NO_TOPIC_TINT
  return {
    term: coverTerm?.trim() || title,
    title,
    background: tint.background,
    text: tint.text,
    photo,
  }
}
```

- [ ] **Step 11: Create `src/lib/site/progress.ts`**

```ts
/**
 * How far through the body the reader is, from 0 to 1, from the body's top edge and height
 * against the window's height (all in pixels, as getBoundingClientRect gives them).
 */
export function readingProgress(top: number, height: number, viewport: number): number {
  const scrollable = height - viewport
  if (scrollable <= 0) return 1
  return Math.min(1, Math.max(0, -top / scrollable))
}
```

- [ ] **Step 12: Create `src/lib/site/theme.ts`**

```ts
export type Theme = 'light' | 'dark'

/** Where the reader's choice is kept in the browser. */
export const THEME_STORAGE_KEY = 'sagevani-theme'

/** Fired on window when the reader switches, so every toggle on the page updates. */
export const THEME_CHANGE_EVENT = 'sagevani-theme-change'

export const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'

export const otherTheme = (theme: Theme): Theme => (theme === 'dark' ? 'light' : 'dark')

/**
 * Runs in <head>, before the first paint, and applies a stored choice so the wrong theme never
 * flashes (stage 3 design, 5.3). With nothing stored, the CSS follows the device. Stage 6's
 * Content Security Policy allows this exact script by its hash, so change it only with that.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}})()`
```

- [ ] **Step 13: Run the tests to see them pass**

Run: `npx vitest run tests/unit/site-format.unit.spec.ts tests/unit/site-links.unit.spec.ts tests/unit/site-sources.unit.spec.ts tests/unit/site-cover.unit.spec.ts tests/unit/site-theme.unit.spec.ts`
Expected: PASS.

- [ ] **Step 14: Commit**

```bash
npm run lint && npm run typecheck
git add src/lib/site tests/unit/site-*.unit.spec.ts
git commit -m "feat: presentation helpers for the public pages"
```

---

### Task 6: Images while storage is off, and image settings

Payload's own file route applies the staff-only read access, so local and CI pages can't load images through it (stage 2 plan, notes for stage 3). A small route serves them while storage is off (spec 4.5).

**Files:**
- Create: `src/lib/site/local-media.ts`, `src/app/(frontend)/local-media/[file]/route.ts`, `tests/unit/local-media.unit.spec.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Write the failing tests.** Create `tests/unit/local-media.unit.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/unit/local-media.unit.spec.ts`
Expected: FAIL: the modules don't exist.

- [ ] **Step 3: Create `src/lib/site/local-media.ts`**

```ts
import { publicFileUrl, type MediaStorageSettings } from '../media-storage'

/** Where uploads are served while storage is off (stage 3 design, 4.5). */
export const LOCAL_MEDIA_PATH = '/local-media'

// Uploads are renamed to a random UUID plus the extension of the type sharp detected (Media.ts).
const UPLOAD_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|avif)$/

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
```

- [ ] **Step 4: Create `src/app/(frontend)/local-media/[file]/route.ts`**

```ts
import { readFile } from 'fs/promises'
import path from 'path'

import { LOCAL_MEDIA_DIR } from '@/collections/Media'
import { parseServerEnv } from '@/lib/env'
import { mediaStorageSettings } from '@/lib/media-storage'
import { localMediaType } from '@/lib/site/local-media'

const notFound = (): Response => new Response('Not found', { status: 404 })

/**
 * Serves an upload from the local folder, only while storage is off: in development and CI.
 * Storage is required wherever the database isn't local, so this never serves on a hosted site.
 * Only upload names are accepted, so no path can leave the folder, and nothing is ever listed.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params
  const type = localMediaType(file)
  if (!type || mediaStorageSettings(parseServerEnv(process.env)) !== null) return notFound()
  try {
    const data = await readFile(path.join(LOCAL_MEDIA_DIR, file))
    return new Response(new Uint8Array(data), {
      headers: { 'Content-Type': type, 'Cache-Control': 'no-store' },
    })
  } catch {
    return notFound()
  }
}
```

- [ ] **Step 5: Run the test to see it pass**

Run: `npx vitest run tests/unit/local-media.unit.spec.ts`
Expected: PASS.

- [ ] **Step 6: Tell `next/image` where images come from.** In `next.config.ts`, above `const nextConfig`, add:

```ts
// next/image resizes only images from known places (stage 3 design, 4.5): the public bucket on
// hosted sites, and the local route while storage is off. MEDIA_PUBLIC_URL is checked at
// startup (src/lib/env.ts); here it only names the host.
const mediaPublicUrl = process.env.MEDIA_PUBLIC_URL?.trim()
const bucket = mediaPublicUrl ? new URL(mediaPublicUrl) : null
```

and inside `nextConfig`, before `webpack`:

```ts
  images: {
    localPatterns: [{ pathname: '/local-media/**', search: '' }],
    remotePatterns: bucket
      ? [
          {
            protocol: 'https',
            hostname: bucket.hostname,
            pathname: `${bucket.pathname.replace(/\/+$/, '')}/**`,
          },
        ]
      : [],
  },
```

- [ ] **Step 7: Commit**

```bash
npm run lint && npm run typecheck
git add src/lib/site/local-media.ts "src/app/(frontend)/local-media" tests/unit/local-media.unit.spec.ts next.config.ts
git commit -m "feat: serve uploads locally while storage is off, and image settings"
```

---

### Task 7: Keep the slug when an edit doesn't send one

The spike found that a REST `PATCH` changing the title without `slug` re-derived the slug from the new title (before you start, fact 6). `deriveSlug` sees only the request's data, so a missing slug looked like an empty one. Once articles are public, that moves a published URL and breaks every link to it. The admin always sends the slug, so it wasn't affected. The assistant's drafting tool and any REST edit were.

**Files:**
- Modify: `src/collections/shared/slug.ts`, `tests/int/articles-fields.int.spec.ts`

- [ ] **Step 1: Write the failing tests.** In `tests/int/articles-fields.int.spec.ts`, extend the helpers import:

```ts
import {
  ASSISTANT_KEY,
  PASSWORD,
  clearContent,
  createStaff,
  rest,
  validationMessages,
} from '../helpers/content'
```

and add after the test `keeps the stored slug when an update only publishes`:

```ts
  it('keeps the stored slug when an edit through the API leaves it out', async () => {
    const live = await payload.create({
      collection: 'articles',
      data: { title: 'Karma', shape: 'vani-note', difficulty: level.id, _status: 'published' },
      overrideAccess: false,
      user: owner,
    })
    const { token } = await payload.login({
      collection: 'users',
      data: { email: owner.email, password: PASSWORD },
    })

    const published = await rest('PATCH', `articles/${live.id}`, {
      token,
      body: { title: 'Karma renamed', _status: 'published' },
    })
    expect(published.status).toBe(200)
    const stored = await payload.findByID({ collection: 'articles', id: live.id, overrideAccess: true })
    expect([stored.title, stored.slug]).toEqual(['Karma renamed', 'karma'])

    const drafted = await rest('PATCH', `articles/${live.id}?draft=true`, {
      key: ASSISTANT_KEY,
      body: { title: 'Karma, a draft title' },
    })
    expect(drafted.status).toBe(200)
    const draft = await payload.findByID({
      collection: 'articles',
      id: live.id,
      draft: true,
      overrideAccess: true,
    })
    expect([draft.title, draft.slug]).toEqual(['Karma, a draft title', 'karma'])
  })

  it('still makes a slug from the title when the slug is sent empty', async () => {
    const created = await draft({ title: 'Karma' })
    const updated = await payload.update({
      collection: 'articles',
      id: created.id,
      data: { title: 'Dharma', slug: '' },
      draft: true,
      overrideAccess: false,
      user: owner,
    })
    expect(updated.slug).toBe('dharma')
  })
```

- [ ] **Step 2: Run them to see the first fail**

Run: `npx vitest run tests/int/articles-fields.int.spec.ts`
Expected: FAIL on `keeps the stored slug when an edit through the API leaves it out`: the slug is `karma-renamed`. The empty-slug test passes already.

- [ ] **Step 3: Fix `deriveSlug`.** In `src/collections/shared/slug.ts`, replace the hook with:

```ts
/**
 * Makes the slug plain ASCII. A typed slug is cleaned; an empty one is made from `sourceField`
 * (`Māyā and the Rope` → `maya-and-the-rope`). An edit that doesn't send a slug at all keeps the
 * stored one: a REST edit sends only what changed, and a title edit must never move a URL.
 */
export const deriveSlug =
  (sourceField: string): CollectionBeforeValidateHook =>
  ({ data, originalDoc }) => {
    if (!data) return data
    const stored: unknown = originalDoc?.slug
    if (data.slug === undefined && typeof stored === 'string' && stored !== '') return data
    const typed = typeof data.slug === 'string' && data.slug.trim() !== '' ? data.slug : undefined
    const source: unknown = typed ?? data[sourceField]
    if (typeof source !== 'string') return data
    return { ...data, slug: slugify(source) || null }
  }
```

- [ ] **Step 4: Run the slug tests to see them pass**

Run: `npx vitest run tests/int/articles-fields.int.spec.ts tests/int/topics-and-levels.int.spec.ts tests/int/pages-and-settings.int.spec.ts`
Expected: PASS. Topics and pages use the same hook.

- [ ] **Step 5: Commit**

```bash
npm run lint && npm run typecheck
git add src/collections/shared/slug.ts tests/int/articles-fields.int.spec.ts
git commit -m "fix: an edit that leaves out the slug keeps the stored one"
```

---

### Task 8: Draft saves, and refreshing pages after published content changes

Spec 4.3. A `beforeOperation` hook records whether a save is a draft save, because `afterChange` can't tell (before you start, fact 4). `refreshSite()` clears the `site` tag, only inside Next.

**Files:**
- Modify: `src/collections/shared/publishing.ts`, `src/collections/articles/Articles.ts`, `src/collections/Pages.ts`, `src/collections/Topics.ts`, `src/collections/DifficultyLevels.ts`, `src/collections/Media.ts`, `src/globals/SiteSettings.ts`
- Create: `src/lib/site/refresh.ts`, `src/collections/shared/refresh.ts`, `tests/unit/refresh.unit.spec.ts`, `tests/int/refresh.int.spec.ts`

- [ ] **Step 1: Write the failing unit test.** Create `tests/unit/refresh.unit.spec.ts`:

```ts
import { revalidateTag } from 'next/cache'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { refreshSite, SITE_TAG } from '@/lib/site/refresh'

vi.mock('next/cache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag: vi.fn(),
}))

const logger = { error: vi.fn() }

describe('refreshSite', () => {
  beforeEach(() => {
    vi.mocked(revalidateTag).mockReset()
    logger.error.mockReset()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('does nothing outside Next, where there is no page to refresh', () => {
    vi.stubEnv('NEXT_RUNTIME', '')
    refreshSite(logger)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('expires the site tag at once inside Next', () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    refreshSite(logger)
    expect(revalidateTag).toHaveBeenCalledWith(SITE_TAG, { expire: 0 })
  })

  it('logs a failure and never throws, so the save stands', () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    vi.mocked(revalidateTag).mockImplementation(() => {
      throw new Error('no store')
    })
    expect(() => refreshSite(logger)).not.toThrow()
    expect(logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      expect.stringContaining('could not be refreshed'),
    )
  })
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/unit/refresh.unit.spec.ts`
Expected: FAIL: `@/lib/site/refresh` does not exist.

- [ ] **Step 3: Create `src/lib/site/refresh.ts`**

```ts
import { revalidateTag } from 'next/cache'
import type { Payload } from 'payload'

/** The cache tag on every public read (stage 3 design, 4.3). */
export const SITE_TAG = 'site'

/**
 * Expires every cached public page and query at once, so each rebuilds on its next request.
 * Next can do this only while it handles a request. Scripts, migrations and tests that call
 * Payload directly run outside Next, where NEXT_RUNTIME is unset and there is no page to refresh.
 * A failure is logged and never undoes the save that asked for it.
 */
export function refreshSite(logger: Pick<Payload['logger'], 'error'>): void {
  if (!process.env.NEXT_RUNTIME) return
  try {
    revalidateTag(SITE_TAG, { expire: 0 })
  } catch (error) {
    logger.error(
      { err: error },
      'The public pages could not be refreshed. They show the old content until the next change.',
    )
  }
}
```

- [ ] **Step 4: Run the unit test to see it pass**

Run: `npx vitest run tests/unit/refresh.unit.spec.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing integration test.** Create `tests/int/refresh.int.spec.ts`:

```ts
import { revalidateTag } from 'next/cache'
import { getPayload, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import config from '@/payload.config'
import type { DifficultyLevel, User } from '@/payload-types'

import { ASSISTANT_KEY, PASSWORD, clearContent, createStaff, rest } from '../helpers/content'

vi.mock('next/cache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/cache')>()),
  revalidateTag: vi.fn(),
}))

let payload: Payload
let owner: User
let level: DifficultyLevel

/** Runs an action as if inside Next and returns how many times it refreshed the site. */
async function refreshesDuring(action: () => Promise<unknown>): Promise<number> {
  vi.mocked(revalidateTag).mockClear()
  vi.stubEnv('NEXT_RUNTIME', 'nodejs')
  try {
    await action()
  } finally {
    vi.unstubAllEnvs()
  }
  return vi.mocked(revalidateTag).mock.calls.length
}

const publish = (title: string) =>
  payload.create({
    collection: 'articles',
    data: { title, shape: 'vani-note', difficulty: level.id, _status: 'published' },
    overrideAccess: false,
    user: owner,
  })

const ownerToken = async (): Promise<string> => {
  const { token } = await payload.login({
    collection: 'users',
    data: { email: owner.email, password: PASSWORD },
  })
  if (!token) throw new Error('The owner could not sign in.')
  return token
}

describe('refreshing the public pages', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearContent(payload)
    ;({ owner } = await createStaff(payload))
    level = await payload.create({
      collection: 'difficultyLevels',
      data: { name: 'Beginner', order: 1 },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  it('refreshes when an article is published', async () => {
    expect(await refreshesDuring(() => publish('Live'))).toBe(1)
    expect(revalidateTag).toHaveBeenCalledWith('site', { expire: 0 })
  })

  it('does not refresh for a draft, a draft over a published article, or an autosave', async () => {
    expect(
      await refreshesDuring(() =>
        payload.create({
          collection: 'articles',
          data: { title: 'A draft' },
          draft: true,
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(0)

    const live = await publish('Live')
    const draftEdit = { collection: 'articles', id: live.id, overrideAccess: false, user: owner } as const
    expect(
      await refreshesDuring(() =>
        payload.update({ ...draftEdit, data: { title: 'Draft title' }, draft: true }),
      ),
    ).toBe(0)
    expect(
      await refreshesDuring(() =>
        payload.update({ ...draftEdit, data: { title: 'Autosaved' }, draft: true, autosave: true }),
      ),
    ).toBe(0)
  })

  it('does not refresh for the assistant’s draft through REST', async () => {
    let status = 0
    expect(
      await refreshesDuring(async () => {
        status = (
          await rest('POST', 'articles?draft=true', {
            key: ASSISTANT_KEY,
            body: { title: 'The assistant’s draft' },
          })
        ).status
      }),
    ).toBe(0)
    expect(status).toBe(201)
  })

  it('refreshes when an article is unpublished', async () => {
    const live = await publish('Live')
    expect(
      await refreshesDuring(() =>
        payload.update({
          collection: 'articles',
          id: live.id,
          data: { _status: 'draft' },
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(1)
  })

  it('refreshes when a published article is deleted, but not a draft', async () => {
    const live = await publish('Live')
    const draft = await payload.create({
      collection: 'articles',
      data: { title: 'A draft' },
      draft: true,
      overrideAccess: true,
    })
    const remove = (id: number) =>
      payload.delete({ collection: 'articles', id, overrideAccess: false, user: owner })
    expect(await refreshesDuring(() => remove(draft.id))).toBe(0)
    expect(await refreshesDuring(() => remove(live.id))).toBe(1)
  })

  it('refreshes when a version is restored and published, not when it is restored as a draft', async () => {
    const live = await publish('Live')
    await payload.update({
      collection: 'articles',
      id: live.id,
      data: { title: 'Second' },
      draft: true,
      overrideAccess: false,
      user: owner,
    })
    const { docs } = await payload.findVersions({
      collection: 'articles',
      where: { parent: { equals: live.id } },
      sort: 'createdAt',
      limit: 1,
      overrideAccess: true,
    })
    const token = await ownerToken()
    const restore = (query: string) =>
      refreshesDuring(async () => {
        const response = await rest('POST', `articles/versions/${docs[0].id}${query}`, { token })
        expect(response.status).toBe(200)
      })
    expect(await restore('?draft=true')).toBe(0)
    expect(await restore('')).toBe(1)
  })

  it('refreshes when a page is published, not when one is saved as a draft', async () => {
    expect(
      await refreshesDuring(() =>
        payload.create({
          collection: 'pages',
          data: { title: 'About', _status: 'published' },
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(1)
    expect(
      await refreshesDuring(() =>
        payload.create({
          collection: 'pages',
          data: { title: 'A draft page' },
          draft: true,
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(0)
  })

  it('refreshes on every change to topics, levels and site settings', async () => {
    expect(
      await refreshesDuring(() =>
        payload.create({
          collection: 'topics',
          data: {
            name: 'A test topic',
            question: 'A test question?',
            order: 9,
            coverTint: { background: '#e3cfa8', text: '#3d2f1c' },
          },
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(1)
    expect(
      await refreshesDuring(() =>
        payload.update({
          collection: 'difficultyLevels',
          id: level.id,
          data: { description: 'Changed for the test' },
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(1)
    expect(
      await refreshesDuring(() =>
        payload.updateGlobal({
          slug: 'siteSettings',
          data: { footerMotto: 'A test motto' },
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(1)
  })

  it('does not refresh for an upload alone, but does when an image is edited or deleted', async () => {
    const data = await sharp({
      create: { width: 8, height: 8, channels: 3, background: '#9a3b26' },
    })
      .png()
      .toBuffer()
    let id = 0
    expect(
      await refreshesDuring(async () => {
        const media = await payload.create({
          collection: 'media',
          data: { alt: 'A square', creator: 'Sagevani', source: 'Made for this test', licence: 'Own work' },
          file: { data, mimetype: 'image/png', name: 'square.png', size: data.length },
          overrideAccess: false,
          user: owner,
        })
        id = media.id
      }),
    ).toBe(0)
    expect(
      await refreshesDuring(() =>
        payload.update({
          collection: 'media',
          id,
          data: { alt: 'A red square' },
          overrideAccess: false,
          user: owner,
        }),
      ),
    ).toBe(1)
    expect(
      await refreshesDuring(() =>
        payload.delete({ collection: 'media', id, overrideAccess: false, user: owner }),
      ),
    ).toBe(1)
  })

  it('never refreshes outside Next, even for a publish', async () => {
    vi.mocked(revalidateTag).mockClear()
    await publish('Live')
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 6: Run it to see it fail**

Run: `npx vitest run tests/int/refresh.int.spec.ts`
Expected: FAIL: every test that expects a refresh gets 0.

- [ ] **Step 7: Record draft saves.** Append to `src/collections/shared/publishing.ts`:

```ts
/** Request-context key: whether this create, update or restore saves a draft. */
export const DRAFT_SAVE = 'draftSave'

/**
 * Records Payload's `draft` flag, which only beforeOperation hooks receive. An unpublish and a
 * draft save look the same to afterChange, so hooks that act only when the live document changes
 * read isDraftSave instead (stage 3a plan, before you start).
 */
export const markDraftSave: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation === 'create' || operation === 'update' || operation === 'restoreVersion') {
    req.context[DRAFT_SAVE] = (args as { draft?: unknown }).draft === true
  }
  return args
}

/** Whether this request's save is a draft save: the live document doesn't change. */
export const isDraftSave = (req: PayloadRequest): boolean => req.context?.[DRAFT_SAVE] === true
```

- [ ] **Step 8: Create the refresh hooks, `src/collections/shared/refresh.ts`**

```ts
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

import { refreshSite } from '../../lib/site/refresh'
import { isDraftSave } from './publishing'

/**
 * Articles and pages: every save but a draft save changes the live document. That covers a
 * publish, an unpublish and a version restored without the draft flag. A draft save, an autosave
 * included, never does. Needs markDraftSave among the collection's beforeOperation hooks.
 */
export const refreshUnlessDraft: CollectionAfterChangeHook = ({ doc, req }) => {
  if (!isDraftSave(req)) refreshSite(req.payload.logger)
  return doc
}

/** Articles and pages: deleting a published document takes it off the site. */
export const refreshIfPublishedDeleted: CollectionAfterDeleteHook = ({ doc, req }) => {
  if ((doc as { _status?: unknown } | undefined)?._status === 'published') {
    refreshSite(req.payload.logger)
  }
  return doc
}

/** Topics and difficulty levels: every change can show on a public page. */
export const refreshAfterChange: CollectionAfterChangeHook = ({ doc, req }) => {
  refreshSite(req.payload.logger)
  return doc
}

export const refreshAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  refreshSite(req.payload.logger)
  return doc
}

/** Media: an upload alone changes no public page; editing an image's details can. */
export const refreshAfterMediaEdit: CollectionAfterChangeHook = ({ doc, operation, req }) => {
  if (operation === 'update') refreshSite(req.payload.logger)
  return doc
}

/** Site settings: every change can show on a public page. */
export const refreshAfterGlobalChange: GlobalAfterChangeHook = ({ doc, req }) => {
  refreshSite(req.payload.logger)
  return doc
}
```

- [ ] **Step 9: Wire them in.**

`src/collections/articles/Articles.ts`. Extend the imports:

```ts
import { markDraftSave, markRestoreAsDraft } from '../shared/publishing'
import { refreshIfPublishedDeleted, refreshUnlessDraft } from '../shared/refresh'
```

(replacing `import { markRestoreAsDraft } from '../shared/publishing'`), and change the hooks:

```ts
  hooks: {
    beforeOperation: [
      draftsOnlyForAssistant,
      refuseBulkPublish,
      autosaveOnlyForDrafts,
      markRestoreAsDraft,
      markDraftSave,
    ],
    beforeValidate: [deriveSlug('title')],
    beforeChange: [
      onlyOwnerPublishes,
      bodyLinksOnlyTo(['articles', 'pages']),
      checkSlug,
      deriveArticleText,
      enforcePublishRules,
      recordApproval,
    ],
    // After the approval is recorded: if that fails, the save rolls back and nothing refreshes.
    afterChange: [recordApprovedVersion, refreshUnlessDraft],
    afterDelete: [refreshIfPublishedDeleted],
  },
```

`src/collections/Pages.ts`. Import the same way:

```ts
import { markDraftSave, markRestoreAsDraft } from './shared/publishing'
import { refreshIfPublishedDeleted, refreshUnlessDraft } from './shared/refresh'
```

and set:

```ts
  hooks: {
    beforeOperation: [markRestoreAsDraft, markDraftSave],
    beforeValidate: [deriveSlug('title')],
    beforeChange: [bodyLinksOnlyTo(['articles', 'pages']), checkSlug],
    afterChange: [refreshUnlessDraft],
    afterDelete: [refreshIfPublishedDeleted],
  },
```

`src/collections/Topics.ts` and `src/collections/DifficultyLevels.ts`. Add `import { refreshAfterChange, refreshAfterDelete } from './shared/refresh'` and, inside each collection's `hooks` (create the `hooks` key in `DifficultyLevels.ts` if it has none), add:

```ts
    afterChange: [refreshAfterChange],
    afterDelete: [refreshAfterDelete],
```

`src/collections/Media.ts`. Add `import { refreshAfterDelete, refreshAfterMediaEdit } from './shared/refresh'` and change its hooks to:

```ts
  hooks: {
    beforeOperation: [randomFileName],
    afterChange: [refreshAfterMediaEdit],
    afterDelete: [refreshAfterDelete],
  },
```

`src/globals/SiteSettings.ts`. Add `import { refreshAfterGlobalChange } from '../collections/shared/refresh'` and, in the global config after `access`:

```ts
  hooks: { afterChange: [refreshAfterGlobalChange] },
```

- [ ] **Step 10: Run the tests to see them pass**

Run: `npx vitest run tests/int/refresh.int.spec.ts tests/unit/refresh.unit.spec.ts`
Expected: PASS.

- [ ] **Step 11: Run every test.** The hooks run on every save, so check nothing else changed.

Run: `npm test`
Expected: PASS.

- [ ] **Step 12: Commit**

```bash
npm run lint && npm run typecheck
git add src/lib/site/refresh.ts src/collections tests/unit/refresh.unit.spec.ts tests/int/refresh.int.spec.ts src/globals/SiteSettings.ts
git commit -m "feat: refresh the public pages when published content changes"
```

---

### Task 9: The public data layer

Every public read, in `src/lib/site/` (spec 4.2). The functions take a `Payload` instance, so integration tests call them directly. Task 10 wraps them in the cache.

**Files:**
- Modify: `tests/helpers/lexical.ts`
- Create: `src/lib/site/body.ts`, `lookups.ts`, `articles.ts`, `pages.ts`, `chrome.ts`, `preview.ts`
- Create: `tests/unit/site-body.unit.spec.ts`, `tests/int/site-data.int.spec.ts`

- [ ] **Step 1: Add editor nodes to the test helpers.** Append to `tests/helpers/lexical.ts`:

```ts
const textNode = (text: string) => ({
  type: 'text',
  version: 1,
  text,
  format: 0,
  mode: 'normal',
  style: '',
  detail: 0,
})

const linkParagraph = (text: string, fields: Record<string, unknown>): LexicalNode => ({
  type: 'paragraph',
  version: 1,
  format: '',
  indent: 0,
  direction: 'ltr',
  textFormat: 0,
  children: [
    {
      type: 'link',
      version: 3,
      format: '',
      indent: 0,
      direction: 'ltr',
      fields,
      children: [textNode(text)],
    },
  ],
})

/** A paragraph that is one internal link to an article or page. */
export const linkTo = (text: string, relationTo: 'articles' | 'pages', id: number): LexicalNode =>
  linkParagraph(text, { linkType: 'internal', newTab: false, doc: { relationTo, value: id } })

/** A paragraph that is one link to an address elsewhere. */
export const externalLink = (text: string, url: string): LexicalNode =>
  linkParagraph(text, { linkType: 'custom', newTab: false, url })

export const tradition = (school: string, interpretation: string): LexicalNode => ({
  type: 'block',
  version: 2,
  format: '',
  fields: { id: blockId(), blockName: '', blockType: 'tradition', school, interpretation },
})

export const practice = (invitation: string): LexicalNode => ({
  type: 'block',
  version: 2,
  format: '',
  fields: { id: blockId(), blockName: '', blockType: 'practice', invitation },
})
```

- [ ] **Step 2: Write the failing unit test.** Create `tests/unit/site-body.unit.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  bodyImage,
  bodyLinkHref,
  bodyReferences,
  docKey,
  linkTargets,
  uniqueIds,
} from '@/lib/site/body'

import { externalLink, image, linkTo, paragraph, richText } from '../helpers/lexical'

const IMAGE = { url: '/local-media/x.png', alt: 'A lamp', width: 640, height: 400 }

describe('bodyReferences', () => {
  it('finds the linked articles and pages and the images, each once', () => {
    const body = richText(
      paragraph('Text.'),
      linkTo('an article', 'articles', 3),
      linkTo('the same article', 'articles', 3),
      linkTo('a page', 'pages', 5),
      externalLink('elsewhere', 'https://example.org'),
      image(7),
      image(7),
    )
    expect(bodyReferences(body)).toEqual({ articles: [3], pages: [5], images: [7] })
  })

  it('finds nothing in empty or malformed content', () => {
    const none = { articles: [], pages: [], images: [] }
    expect(bodyReferences(null)).toEqual(none)
    expect(bodyReferences({ root: 'not a node' })).toEqual(none)
  })
})

describe('uniqueIds', () => {
  it('keeps well-formed ids once, as numbers', () => {
    expect(uniqueIds([1, '1', '2', { id: 3 }, null, 'x', 0, -4])).toEqual([1, 2, 3])
  })
})

describe('linkTargets', () => {
  it('points published articles at /articles/<slug> and pages at /<slug>', () => {
    expect(linkTargets({ '3': { slug: 'maya' } }, { '5': 'about' })).toEqual({
      [docKey('articles', 3)]: '/articles/maya',
      [docKey('pages', 5)]: '/about',
    })
  })
})

describe('bodyLinkHref', () => {
  const links = { [docKey('articles', 3)]: '/articles/maya' }

  it('gives a published document’s path', () => {
    expect(
      bodyLinkHref({ linkType: 'internal', doc: { relationTo: 'articles', value: 3 } }, links),
    ).toBe('/articles/maya')
  })

  it('gives null for a document that is not published, so the text shows without a link', () => {
    expect(
      bodyLinkHref({ linkType: 'internal', doc: { relationTo: 'articles', value: 4 } }, links),
    ).toBeNull()
  })

  it('keeps a safe address and refuses an unsafe one', () => {
    expect(bodyLinkHref({ linkType: 'custom', url: 'https://example.org' }, links)).toBe(
      'https://example.org',
    )
    expect(bodyLinkHref({ linkType: 'custom', url: 'javascript:alert(1)' }, links)).toBeNull()
  })

  it('gives null for malformed fields', () => {
    expect(bodyLinkHref(null, links)).toBeNull()
    expect(bodyLinkHref({ linkType: 'internal' }, links)).toBeNull()
    expect(bodyLinkHref({ linkType: 'internal', doc: { value: 3 } }, links)).toBeNull()
  })
})

describe('bodyImage', () => {
  const images = { '7': IMAGE }

  it('gives an image the page may show', () => {
    expect(bodyImage({ relationTo: 'media', value: 7 }, images)).toBe(IMAGE)
    expect(bodyImage({ relationTo: 'media', value: { id: 7 } }, images)).toBe(IMAGE)
  })

  it('gives null for an image that is gone or from another collection', () => {
    expect(bodyImage({ relationTo: 'media', value: 8 }, images)).toBeNull()
    expect(bodyImage({ relationTo: 'users', value: 7 }, images)).toBeNull()
  })
})
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/unit/site-body.unit.spec.ts`
Expected: FAIL: `@/lib/site/body` does not exist.

- [ ] **Step 4: Create `src/lib/site/body.ts`**

```ts
import { idOf, isDatabaseId } from '../ids'
import { findLinkedDocuments, findUploadIds } from '../rich-text'
import { safeHref } from './links'
import type { PublicImage } from './types'

/** The key of a link target in BodyContext.links. */
export const docKey = (relationTo: string, id: number | string): string => `${relationTo}:${id}`

/** Each well-formed id once, as a number. Anything else never reaches a query. */
export function uniqueIds(values: readonly unknown[]): number[] {
  return [
    ...new Set(
      values
        .map(idOf)
        .filter((id) => isDatabaseId(id))
        .map(Number),
    ),
  ]
}

export interface BodyReferences {
  articles: number[]
  pages: number[]
  images: number[]
}

/** The articles and pages a body links to, and its images. */
export function bodyReferences(body: unknown): BodyReferences {
  const links = findLinkedDocuments(body).filter((linked) => linked.kind === 'link')
  const linkedIn = (relationTo: string): number[] =>
    uniqueIds(links.filter((linked) => linked.relationTo === relationTo).map((linked) => linked.value))
  return { articles: linkedIn('articles'), pages: linkedIn('pages'), images: uniqueIds(findUploadIds(body)) }
}

/** Link targets by docKey: published articles at /articles/<slug>, published pages at /<slug>. */
export function linkTargets(
  articles: Record<string, { slug: string }>,
  pages: Record<string, string>,
): Record<string, string> {
  return {
    ...Object.fromEntries(
      Object.entries(articles).map(([id, { slug }]) => [docKey('articles', id), `/articles/${slug}`]),
    ),
    ...Object.fromEntries(Object.entries(pages).map(([id, slug]) => [docKey('pages', id), `/${slug}`])),
  }
}

/**
 * A link node's address: a published document's path, or a safe URL. Null renders the link's
 * text without a link (stage 3 design, 4.2).
 */
export function bodyLinkHref(fields: unknown, links: Record<string, string>): string | null {
  if (typeof fields !== 'object' || fields === null) return null
  const { linkType, url, doc } = fields as { linkType?: unknown; url?: unknown; doc?: unknown }
  if (linkType !== 'internal') return safeHref(url)
  const { relationTo, value } = (typeof doc === 'object' && doc !== null ? doc : {}) as {
    relationTo?: unknown
    value?: unknown
  }
  const id = idOf(value)
  return typeof relationTo === 'string' && id !== null ? (links[docKey(relationTo, id)] ?? null) : null
}

/** An upload node's image, when it is one the page may show. */
export function bodyImage(
  node: { relationTo?: unknown; value?: unknown },
  images: Record<string, PublicImage>,
): PublicImage | null {
  if (node.relationTo !== 'media') return null
  const id = idOf(node.value)
  return id === null ? null : (images[String(id)] ?? null)
}
```

- [ ] **Step 5: Run the unit test to see it pass**

Run: `npx vitest run tests/unit/site-body.unit.spec.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing integration test.** Create `tests/int/site-data.int.spec.ts`:

```ts
import {
  getPayload,
  type Payload,
  type PayloadRequest,
  type RequiredDataFromCollectionSlug,
} from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_TAGLINE } from '@/globals/SiteSettings'
import { findPublishedArticle, findRelatedArticles } from '@/lib/site/articles'
import { findSiteChrome } from '@/lib/site/chrome'
import { findArticlePreview, findPagePreview } from '@/lib/site/preview'
import config from '@/payload.config'
import type { Article, DifficultyLevel, Media, Topic, User } from '@/payload-types'

import { clearContent, createStaff } from '../helpers/content'
import { image, linkTo, paragraph, richText } from '../helpers/lexical'

let payload: Payload
let owner: User
let level: DifficultyLevel
let topic: Topic
let photo: Media
let linked: Article
let later: Article
let main: Article

type ArticleData = Partial<RequiredDataFromCollectionSlug<'articles'>> & { title: string }

const publish = (data: ArticleData) =>
  payload.create({
    collection: 'articles',
    data: { shape: 'inquiry-essay', difficulty: level.id, ...data, _status: 'published' },
    overrideAccess: false,
    user: owner,
  })

/** The owner as a signed-in request carries them: with the collection Payload adds on sign-in. */
const asViewer = (user: User): PayloadRequest['user'] =>
  ({ ...user, collection: 'users' }) as PayloadRequest['user']

describe('the public data layer', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearContent(payload)
    ;({ owner } = await createStaff(payload))
    await payload.updateGlobal({
      slug: 'siteSettings',
      data: { tagline: DEFAULT_TAGLINE, footerMotto: null, navigation: [], featuredArticle: null, featuredPicks: [], startHere: [] },
      overrideAccess: true,
    })
    level = await payload.create({
      collection: 'difficultyLevels',
      data: { name: 'Beginner', order: 1 },
      overrideAccess: true,
    })
    topic = await payload.create({
      collection: 'topics',
      data: {
        name: 'Dharma',
        slug: 'dharma',
        question: 'How shall I live?',
        order: 1,
        coverTint: { background: '#e3cfa8', text: '#3d2f1c' },
      },
      overrideAccess: true,
    })
    const data = await sharp({ create: { width: 64, height: 40, channels: 3, background: '#9a3b26' } })
      .png()
      .toBuffer()
    photo = await payload.create({
      collection: 'media',
      data: { alt: 'A vermilion field', creator: 'Sagevani', source: 'Made for this test', licence: 'Own work' },
      file: { data, mimetype: 'image/png', name: 'field.png', size: data.length },
      overrideAccess: true,
    })

    linked = await publish({ title: 'A linked article', slug: 'linked', topics: [topic.id] })
    later = await publish({ title: 'Unpublished later', slug: 'unpublished-later' })
    const draftOnly = await payload.create({
      collection: 'articles',
      data: { title: 'Only a draft', slug: 'only-a-draft' },
      draft: true,
      overrideAccess: true,
    })
    main = await publish({
      title: 'The main article',
      slug: 'main',
      summary: 'One sentence.',
      topics: [topic.id],
      coverTerm: 'dharma',
      coverImage: photo.id,
      background: 'Some background.',
      readFirst: [
        { kind: 'internal', article: linked.id, reason: 'It comes first.' },
        { kind: 'internal', article: later.id, reason: 'Unpublished after this was written.' },
        { kind: 'external', title: 'A book', author: 'An author', url: 'javascript:alert(1)', reason: 'Context.' },
      ],
      body: richText(
        paragraph('Opening.'),
        linkTo('to the linked article', 'articles', linked.id),
        linkTo('to a draft', 'articles', draftOnly.id),
        image(photo.id),
      ),
      sources: [
        { type: 'academic', work: 'A study' },
        { type: 'primary-text', work: 'A text' },
      ],
      corrections: [
        { date: '2026-10-01', change: 'An older public note.', showPublicNote: true },
        { date: '2026-10-05', change: 'A private note.', showPublicNote: false },
        { date: '2026-10-09', change: 'A newer public note.', showPublicNote: true },
      ],
    })
    await payload.update({
      collection: 'articles',
      id: later.id,
      data: { _status: 'draft' },
      overrideAccess: false,
      user: owner,
    })
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  describe('findPublishedArticle', () => {
    it('returns the view of a published article', async () => {
      const view = await findPublishedArticle(payload, 'main')
      expect(view).toMatchObject({
        title: 'The main article',
        slug: 'main',
        summary: 'One sentence.',
        shapeLabel: 'Inquiry Essay',
        difficulty: 'Beginner',
        background: 'Some background.',
        seo: { title: null, description: null },
      })
      expect(view?.topics.map(({ name }) => name)).toEqual(['Dharma'])
      expect(view?.cover).toMatchObject({ term: 'dharma', background: '#e3cfa8', text: '#3d2f1c' })
      expect(view?.readingTime).toBeGreaterThan(0)
      expect(view?.publishedAt).toEqual(expect.any(String))
    })

    it('gives null for a draft-only article, an unpublished one, and an unknown slug', async () => {
      expect(await findPublishedArticle(payload, 'only-a-draft')).toBeNull()
      expect(await findPublishedArticle(payload, 'unpublished-later')).toBeNull()
      expect(await findPublishedArticle(payload, 'no-such-article')).toBeNull()
    })

    it('shows the published version while a newer draft waits', async () => {
      await payload.update({
        collection: 'articles',
        id: main.id,
        data: { title: 'A newer draft title' },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      expect((await findPublishedArticle(payload, 'main'))?.title).toBe('The main article')
    })

    it('never carries staff-only fields or media details', async () => {
      const json = JSON.stringify(await findPublishedArticle(payload, 'main'))
      for (const hidden of [
        'approval',
        'versionId',
        'editorialChecklist',
        'emailRecipients',
        'emailSentAt',
        'searchText',
        'sendEmail',
        owner.email,
        'Made for this test',
        'Own work',
      ]) {
        expect(json).not.toContain(hidden)
      }
    })

    it('links only to published documents', async () => {
      const view = await findPublishedArticle(payload, 'main')
      expect(view?.bodyContext.links).toEqual({ [`articles:${linked.id}`]: '/articles/linked' })
    })

    it('gives the cover and body images with only what a page needs', async () => {
      const view = await findPublishedArticle(payload, 'main')
      const expected = { url: `/local-media/${photo.filename}`, alt: 'A vermilion field', width: 64, height: 40 }
      expect(view?.cover.photo).toEqual(expected)
      expect(view?.bodyContext.images).toEqual({ [String(photo.id)]: expected })
    })

    it('drops a prior reading no longer published, and shows an unsafe address as text', async () => {
      expect((await findPublishedArticle(payload, 'main'))?.readFirst).toEqual([
        { title: 'A linked article', href: '/articles/linked', author: null, reason: 'It comes first.' },
        { title: 'A book', href: null, author: 'An author', reason: 'Context.' },
      ])
    })

    it('groups sources in tier order, and keeps public corrections, newest first', async () => {
      const view = await findPublishedArticle(payload, 'main')
      expect(view?.sources.map(({ label }) => label)).toEqual(['Primary text', 'Academic'])
      expect(view?.corrections).toEqual([
        { date: '9 October 2026', change: 'A newer public note.' },
        { date: '1 October 2026', change: 'An older public note.' },
      ])
    })
  })

  describe('findRelatedArticles', () => {
    it('lists other published articles from the topic, newest first, at most three', async () => {
      for (const n of [1, 2, 3, 4]) {
        await publish({ title: `Related ${n}`, slug: `related-${n}`, topics: [topic.id] })
      }
      await payload.create({
        collection: 'articles',
        data: { title: 'A draft in the topic', topics: [topic.id] },
        draft: true,
        overrideAccess: true,
      })
      const related = await findRelatedArticles(payload, topic.id, main.id)
      expect(related.map(({ slug }) => slug)).toEqual(['related-4', 'related-3', 'related-2'])
      expect(related[0]).toMatchObject({ title: 'Related 4', difficulty: 'Beginner', topics: [{ name: 'Dharma' }] })
    })
  })

  describe('findSiteChrome', () => {
    it('falls back to the default tagline, with no motto and no navigation', async () => {
      expect(await findSiteChrome(payload)).toEqual({
        tagline: DEFAULT_TAGLINE,
        footerMotto: null,
        navigation: [],
      })
    })

    it('gives the motto and navigation from site settings', async () => {
      await payload.updateGlobal({
        slug: 'siteSettings',
        data: { footerMotto: ' A test motto ', navigation: [{ label: 'Articles', path: '/articles' }] },
        overrideAccess: true,
      })
      expect(await findSiteChrome(payload)).toEqual({
        tagline: DEFAULT_TAGLINE,
        footerMotto: 'A test motto',
        navigation: [{ label: 'Articles', path: '/articles' }],
      })
    })
  })

  describe('previews', () => {
    it('give staff the latest draft of an article', async () => {
      await payload.update({
        collection: 'articles',
        id: main.id,
        data: { title: 'A newer draft title' },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      const view = await findArticlePreview(payload, String(main.id), asViewer(owner))
      expect(view?.title).toBe('A newer draft title')
      expect(view?.bodyContext.links).toEqual({ [`articles:${linked.id}`]: '/articles/linked' })
    })

    it('give nobody else anything, and refuse an id that is not one', async () => {
      expect(await findArticlePreview(payload, String(main.id), null)).toBeNull()
      expect(await findArticlePreview(payload, '1;drop', asViewer(owner))).toBeNull()
      expect(await findArticlePreview(payload, '999999', asViewer(owner))).toBeNull()
    })

    it('title a draft that has no title yet', async () => {
      const empty = await payload.create({ collection: 'articles', data: {}, draft: true, overrideAccess: true })
      expect((await findArticlePreview(payload, String(empty.id), asViewer(owner)))?.title).toBe('Untitled')
    })

    it('give staff the latest draft of a page', async () => {
      const page = await payload.create({
        collection: 'pages',
        data: { title: 'About', body: richText(paragraph('A draft page.')) },
        draft: true,
        overrideAccess: true,
      })
      expect(await findPagePreview(payload, String(page.id), asViewer(owner))).toMatchObject({
        title: 'About',
        slug: 'about',
      })
      expect(await findPagePreview(payload, String(page.id), null)).toBeNull()
    })
  })
})
```

- [ ] **Step 7: Run it to see it fail**

Run: `npx vitest run tests/int/site-data.int.spec.ts`
Expected: FAIL: the modules don't exist.

- [ ] **Step 8: Create `src/lib/site/lookups.ts`**

```ts
import type { Payload } from 'payload'

import { parseServerEnv } from '../env'
import { mediaStorageSettings } from '../media-storage'
import { imageSrcFor } from './local-media'
import type { PublicImage, TopicRef } from './types'

/** Enough rows for the owner-edited lists: a handful of topics and levels. */
const ALL = 100

// Every read here but publicImages is anonymous: overrideAccess false and no user, so the
// collections' access rules decide what comes back (stage 3 design, 4.2).

/** Every topic, in display order. */
export async function allTopics(payload: Payload): Promise<TopicRef[]> {
  const { docs } = await payload.find({
    collection: 'topics',
    overrideAccess: false,
    depth: 0,
    sort: 'order',
    limit: ALL,
    select: { name: true, slug: true, question: true, coverTint: true },
  })
  return docs.map((topic) => ({
    id: topic.id,
    name: topic.name,
    slug: topic.slug ?? '',
    question: topic.question,
    tint: { background: topic.coverTint.background, text: topic.coverTint.text },
  }))
}

/** Difficulty level names by id. */
export async function levelNames(payload: Payload): Promise<Record<string, string>> {
  const { docs } = await payload.find({
    collection: 'difficultyLevels',
    overrideAccess: false,
    depth: 0,
    limit: ALL,
    select: { name: true },
  })
  return Object.fromEntries(docs.map((level) => [String(level.id), level.name]))
}

/** Published articles by id, with their slug and current title. The access rules leave out the rest. */
export async function publishedArticles(
  payload: Payload,
  ids: readonly number[],
): Promise<Record<string, { slug: string; title: string }>> {
  if (ids.length === 0) return {}
  const { docs } = await payload.find({
    collection: 'articles',
    overrideAccess: false,
    depth: 0,
    where: { id: { in: [...ids] } },
    limit: ids.length,
    select: { slug: true, title: true },
  })
  return Object.fromEntries(
    docs.flatMap((article): [string, { slug: string; title: string }][] =>
      article.slug ? [[String(article.id), { slug: article.slug, title: article.title }]] : [],
    ),
  )
}

/** Published pages' slugs by id. */
export async function publishedPageSlugs(
  payload: Payload,
  ids: readonly number[],
): Promise<Record<string, string>> {
  if (ids.length === 0) return {}
  const { docs } = await payload.find({
    collection: 'pages',
    overrideAccess: false,
    depth: 0,
    where: { id: { in: [...ids] } },
    limit: ids.length,
    select: { slug: true },
  })
  return Object.fromEntries(
    docs.flatMap((page): [string, string][] => (page.slug ? [[String(page.id), page.slug]] : [])),
  )
}

/**
 * Images by id, with only what a page needs. Media is staff-only (stage 2 design, 4.1), so an
 * anonymous read returns nothing. This is the one public read that overrides access: the ids
 * come from published content, and nothing but these fields is read (stage 3 design, 4.2).
 */
export async function publicImages(
  payload: Payload,
  ids: readonly number[],
): Promise<Record<string, PublicImage>> {
  if (ids.length === 0) return {}
  const storage = mediaStorageSettings(parseServerEnv(process.env))
  const { docs } = await payload.find({
    collection: 'media',
    overrideAccess: true,
    depth: 0,
    where: { id: { in: [...ids] } },
    limit: ids.length,
    select: { filename: true, prefix: true, alt: true, width: true, height: true },
  })
  return Object.fromEntries(
    docs.flatMap((media): [string, PublicImage][] =>
      media.filename && media.width && media.height
        ? [
            [
              String(media.id),
              {
                url: imageSrcFor({ filename: media.filename, prefix: media.prefix }, storage),
                alt: media.alt,
                width: media.width,
                height: media.height,
              },
            ],
          ]
        : [],
    ),
  )
}
```

- [ ] **Step 9: Create `src/lib/site/articles.ts`**

```ts
import type { Payload } from 'payload'

import type { Article } from '../../payload-types'
import { idOf } from '../ids'
import { bodyReferences, linkTargets, uniqueIds } from './body'
import { coverFor } from './cover'
import { formatDate, shapeLabel } from './format'
import { safeHref } from './links'
import { allTopics, levelNames, publicImages, publishedArticles, publishedPageSlugs } from './lookups'
import { groupSources } from './sources'
import {
  UNTITLED,
  type ArticleCard,
  type ArticleView,
  type PriorReading,
  type PublicCorrection,
  type PublicImage,
  type TopicRef,
} from './types'

/** How many related articles the article page shows. */
export const RELATED_LIMIT = 3

/** What a card needs. Staff-only fields are never selected, and their access rules hide them anyway. */
export const ARTICLE_CARD_SELECT = {
  title: true,
  slug: true,
  summary: true,
  shape: true,
  topics: true,
  difficulty: true,
  readingTime: true,
  publishedAt: true,
  coverTerm: true,
  coverImage: true,
} as const

export const ARTICLE_SELECT = {
  ...ARTICLE_CARD_SELECT,
  background: true,
  readFirst: true,
  body: true,
  sources: true,
  corrections: true,
  seo: true,
} as const

/** An article as these selects read it. Fields are optional: a preview reads drafts, which may be incomplete. */
export type ArticleRow = Pick<Article, 'id'> & Partial<Pick<Article, keyof typeof ARTICLE_SELECT>>

interface Lookups {
  topics: TopicRef[]
  levels: Record<string, string>
  images: Record<string, PublicImage>
}

const text = (value: string | null | undefined): string | null => value?.trim() || null

function toCard(row: ArticleRow, { topics, levels, images }: Lookups): ArticleCard {
  const byId = new Map(topics.map((topic) => [String(topic.id), topic]))
  // The article's own order of topics: the first gives the cover tint and "More from".
  const articleTopics = (row.topics ?? []).flatMap((value) => {
    const topic = byId.get(String(idOf(value)))
    return topic ? [topic] : []
  })
  const coverId = idOf(row.coverImage)
  const difficultyId = idOf(row.difficulty)
  const title = text(row.title) ?? UNTITLED
  return {
    id: row.id,
    slug: row.slug ?? '',
    title,
    summary: text(row.summary),
    shapeLabel: shapeLabel(row.shape),
    topics: articleTopics,
    difficulty: difficultyId === null ? null : (levels[String(difficultyId)] ?? null),
    readingTime: row.readingTime ?? null,
    publishedAt: row.publishedAt ?? null,
    cover: coverFor({
      title,
      coverTerm: row.coverTerm,
      firstTopic: articleTopics[0] ?? null,
      photo: coverId === null ? null : (images[String(coverId)] ?? null),
    }),
  }
}

/** Cards for article rows, with one batched read of what they share. */
export async function toArticleCards(
  payload: Payload,
  rows: readonly ArticleRow[],
): Promise<ArticleCard[]> {
  const [topics, levels, images] = await Promise.all([
    allTopics(payload),
    levelNames(payload),
    publicImages(payload, uniqueIds(rows.map((row) => row.coverImage))),
  ])
  return rows.map((row) => toCard(row, { topics, levels, images }))
}

function priorReadings(
  items: ArticleRow['readFirst'],
  articles: Record<string, { slug: string; title: string }>,
): PriorReading[] {
  return (items ?? []).flatMap((item): PriorReading[] => {
    const reason = text(item.reason)
    if (item.kind === 'internal') {
      const target = articles[String(idOf(item.article))]
      return target ? [{ title: target.title, href: `/articles/${target.slug}`, author: null, reason }] : []
    }
    const title = text(item.title)
    return title ? [{ title, href: safeHref(item.url), author: text(item.author), reason }] : []
  })
}

/** Corrections marked to show a public note, newest first. */
function publicCorrections(items: ArticleRow['corrections']): PublicCorrection[] {
  return (items ?? [])
    .filter((item) => item.showPublicNote === true)
    .flatMap((item) => {
      const date = formatDate(item.date)
      return date ? [{ at: item.date, date, change: item.change }] : []
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .map(({ date, change }) => ({ date, change }))
}

/**
 * Everything the article page shows. Links and prior readings reach only published articles,
 * whoever is reading, so a preview shows what the public will see.
 */
export async function toArticleView(payload: Payload, row: ArticleRow): Promise<ArticleView> {
  const refs = bodyReferences(row.body)
  const readFirstIds = uniqueIds(
    (row.readFirst ?? []).filter((item) => item.kind === 'internal').map((item) => item.article),
  )
  const [topics, levels, images, articles, pages] = await Promise.all([
    allTopics(payload),
    levelNames(payload),
    publicImages(payload, uniqueIds([row.coverImage, ...refs.images])),
    publishedArticles(payload, uniqueIds([...refs.articles, ...readFirstIds])),
    publishedPageSlugs(payload, refs.pages),
  ])
  return {
    ...toCard(row, { topics, levels, images }),
    background: text(row.background),
    readFirst: priorReadings(row.readFirst, articles),
    body: row.body ?? null,
    bodyContext: { images, links: linkTargets(articles, pages) },
    sources: groupSources(row.sources),
    corrections: publicCorrections(row.corrections),
    seo: { title: text(row.seo?.title), description: text(row.seo?.description) },
  }
}

/** The published article with this slug, or null. */
export async function findPublishedArticle(payload: Payload, slug: string): Promise<ArticleView | null> {
  const { docs } = await payload.find({
    collection: 'articles',
    overrideAccess: false,
    depth: 0,
    where: { slug: { equals: slug } },
    limit: 1,
    select: ARTICLE_SELECT,
  })
  return docs[0] ? toArticleView(payload, docs[0]) : null
}

/** Other published articles from a topic, newest first. */
export async function findRelatedArticles(
  payload: Payload,
  topicId: number,
  excludeId: number,
  limit = RELATED_LIMIT,
): Promise<ArticleCard[]> {
  const { docs } = await payload.find({
    collection: 'articles',
    overrideAccess: false,
    depth: 0,
    where: { and: [{ topics: { in: [topicId] } }, { id: { not_equals: excludeId } }] },
    sort: ['-publishedAt', '-id'],
    limit,
    select: ARTICLE_CARD_SELECT,
  })
  return toArticleCards(payload, docs)
}
```

- [ ] **Step 10: Create `src/lib/site/pages.ts`**

```ts
import type { Payload } from 'payload'

import type { Page } from '../../payload-types'
import { bodyReferences, linkTargets } from './body'
import { publicImages, publishedArticles, publishedPageSlugs } from './lookups'
import { UNTITLED, type PageView } from './types'

export const PAGE_SELECT = { title: true, slug: true, body: true } as const

/** A page as PAGE_SELECT reads it; optional fields because a preview reads drafts. */
export type PageRow = Pick<Page, 'id'> & Partial<Pick<Page, keyof typeof PAGE_SELECT>>

/** A page's title and body, with its images and published link targets. */
export async function toPageView(payload: Payload, row: PageRow): Promise<PageView> {
  const refs = bodyReferences(row.body)
  const [images, articles, pages] = await Promise.all([
    publicImages(payload, refs.images),
    publishedArticles(payload, refs.articles),
    publishedPageSlugs(payload, refs.pages),
  ])
  return {
    id: row.id,
    slug: row.slug ?? '',
    title: row.title?.trim() || UNTITLED,
    body: row.body ?? null,
    bodyContext: { images, links: linkTargets(articles, pages) },
  }
}
```

- [ ] **Step 11: Create `src/lib/site/chrome.ts`**

```ts
import type { Payload } from 'payload'

import { DEFAULT_TAGLINE } from '../../globals/SiteSettings'
import type { SiteChrome } from './types'

/** The tagline, footer motto and navigation from site settings, for the header and footer. */
export async function findSiteChrome(payload: Payload): Promise<SiteChrome> {
  const settings = await payload.findGlobal({
    slug: 'siteSettings',
    overrideAccess: false,
    depth: 0,
    select: { tagline: true, footerMotto: true, navigation: true },
  })
  return {
    tagline: settings.tagline?.trim() || DEFAULT_TAGLINE,
    footerMotto: settings.footerMotto?.trim() || null,
    navigation: (settings.navigation ?? []).map(({ label, path }) => ({ label, path })),
  }
}
```

- [ ] **Step 12: Create `src/lib/site/preview.ts`**

```ts
import type { Payload, PayloadRequest } from 'payload'

import { isStaff } from '../../access/roles'
import { isDatabaseId } from '../ids'
import { ARTICLE_SELECT, toArticleView } from './articles'
import { PAGE_SELECT, toPageView } from './pages'
import type { ArticleView, PageView } from './types'

type Viewer = PayloadRequest['user']

/**
 * The latest draft of an article, for the owner or the assistant only (stage 3 design, 4.4).
 * Null for anyone else, for an id that isn't one, and for a missing article, so the route
 * answers 404 without saying whether the article exists.
 */
export async function findArticlePreview(
  payload: Payload,
  id: string,
  viewer: Viewer,
): Promise<ArticleView | null> {
  if (!isStaff(viewer) || !isDatabaseId(id)) return null
  const row = await payload.findByID({
    collection: 'articles',
    id: Number(id),
    draft: true,
    overrideAccess: false,
    user: viewer ?? undefined,
    depth: 0,
    select: ARTICLE_SELECT,
    disableErrors: true,
  })
  return row ? toArticleView(payload, row) : null
}

/** The latest draft of a page, for staff only. */
export async function findPagePreview(
  payload: Payload,
  id: string,
  viewer: Viewer,
): Promise<PageView | null> {
  if (!isStaff(viewer) || !isDatabaseId(id)) return null
  const row = await payload.findByID({
    collection: 'pages',
    id: Number(id),
    draft: true,
    overrideAccess: false,
    user: viewer ?? undefined,
    depth: 0,
    select: PAGE_SELECT,
    disableErrors: true,
  })
  return row ? toPageView(payload, row) : null
}
```

- [ ] **Step 13: Run the tests to see them pass**

Run: `npx vitest run tests/int/site-data.int.spec.ts tests/unit/site-body.unit.spec.ts`
Expected: PASS.

If `npm run typecheck` reports that a `find` or `findByID` result isn't assignable to `ArticleRow` or `PageRow`, the select type and the row type have drifted. Check that every key of `ARTICLE_SELECT` and `PAGE_SELECT` is a field of the collection. Don't cast the rows.

- [ ] **Step 14: Commit**

```bash
npm run lint && npm run typecheck
git add src/lib/site tests/helpers/lexical.ts tests/unit/site-body.unit.spec.ts tests/int/site-data.int.spec.ts
git commit -m "feat: the public data layer, reading as an anonymous visitor"
```

---

### Task 10: Cached reads and article metadata

**Files:**
- Create: `src/lib/site/cached.ts`, `src/lib/site/metadata.ts`, `tests/helpers/site.ts`, `tests/unit/site-metadata.unit.spec.ts`
- Modify: `vitest.config.mts`

- [ ] **Step 1: Add an article-view fixture.** Create `tests/helpers/site.ts`:

```ts
import type { ArticleView } from '@/lib/site/types'

/** A published article's view, for tests that only render or describe one. */
export function articleView(overrides: Partial<ArticleView> = {}): ArticleView {
  return {
    id: 1,
    slug: 'maya-and-the-rope',
    title: 'Māyā and the rope',
    summary: 'A test summary.',
    shapeLabel: 'Inquiry Essay',
    topics: [],
    difficulty: 'Beginner',
    readingTime: 4,
    publishedAt: '2026-10-11T09:30:00.000Z',
    cover: {
      term: 'māyā',
      title: 'Māyā and the rope',
      background: '#efe6d2',
      text: '#2b2621',
      photo: null,
    },
    background: null,
    readFirst: [],
    body: null,
    bodyContext: { images: {}, links: {} },
    sources: [],
    corrections: [],
    seo: { title: null, description: null },
    ...overrides,
  }
}
```

- [ ] **Step 2: Write the failing test.** Create `tests/unit/site-metadata.unit.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { articleMetadata, articlePath } from '@/lib/site/metadata'

import { articleView } from '../helpers/site'

describe('articleMetadata', () => {
  it('uses the title and summary, with the article’s canonical path', () => {
    expect(articleMetadata(articleView())).toEqual({
      title: 'Māyā and the rope',
      description: 'A test summary.',
      alternates: { canonical: '/articles/maya-and-the-rope' },
      openGraph: {
        type: 'article',
        siteName: 'SageVani',
        title: 'Māyā and the rope',
        description: 'A test summary.',
        url: '/articles/maya-and-the-rope',
        publishedTime: '2026-10-11T09:30:00.000Z',
        images: undefined,
      },
    })
  })

  it('prefers the SEO overrides', () => {
    const metadata = articleMetadata(
      articleView({ seo: { title: 'An SEO title', description: 'An SEO description.' } }),
    )
    expect([metadata.title, metadata.description]).toEqual(['An SEO title', 'An SEO description.'])
  })

  it('offers the cover photo as the link preview when there is one', () => {
    const photo = { url: '/local-media/x.png', alt: 'A lamp', width: 1200, height: 630 }
    const metadata = articleMetadata(articleView({ cover: { ...articleView().cover, photo } }))
    expect(metadata.openGraph?.images).toEqual([photo])
  })

  it('builds article paths', () => {
    expect(articlePath('maya')).toBe('/articles/maya')
  })
})
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run tests/unit/site-metadata.unit.spec.ts`
Expected: FAIL: `@/lib/site/metadata` does not exist.

- [ ] **Step 4: Create `src/lib/site/metadata.ts`**

```ts
import type { Metadata } from 'next'

import type { ArticleView } from './types'

export const articlePath = (slug: string): string => `/articles/${slug}`

/**
 * An article's title, description, canonical address and link preview (stage 3 design, 6.1).
 * Addresses are relative: the layout's metadataBase (SITE_URL) makes them absolute. Until stage
 * 3b builds /og/[slug], an article without a cover photo has no link-preview image.
 */
export function articleMetadata(article: ArticleView): Metadata {
  const title = article.seo.title ?? article.title
  const description = article.seo.description ?? article.summary ?? undefined
  const path = articlePath(article.slug)
  const photo = article.cover.photo
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      siteName: 'SageVani',
      title,
      description,
      url: path,
      publishedTime: article.publishedAt ?? undefined,
      images: photo
        ? [{ url: photo.url, width: photo.width, height: photo.height, alt: photo.alt }]
        : undefined,
    },
  }
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run tests/unit/site-metadata.unit.spec.ts`
Expected: PASS.

- [ ] **Step 6: Create `src/lib/site/cached.ts`**

```ts
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { findPublishedArticle, findRelatedArticles } from './articles'
import { findSiteChrome } from './chrome'
import { SITE_TAG } from './refresh'

/**
 * The public routes' reads, cached until published content changes (stage 3 design, 4.3). Each
 * entry carries the site tag, which refreshSite expires, and its arguments are part of its key.
 * unstable_cache needs Next's request context, so these run only inside Next: the browser tests
 * cover them, and the functions they wrap have their own tests.
 */
const CACHE = { tags: [SITE_TAG] }

const payload = () => getPayload({ config })

export const getSiteChrome = unstable_cache(
  async () => findSiteChrome(await payload()),
  ['site-chrome'],
  CACHE,
)

export const getArticle = unstable_cache(
  async (slug: string) => findPublishedArticle(await payload(), slug),
  ['article'],
  CACHE,
)

export const getRelatedArticles = unstable_cache(
  async (topicId: number, excludeId: number) =>
    findRelatedArticles(await payload(), topicId, excludeId),
  ['related-articles'],
  CACHE,
)
```

- [ ] **Step 7: Leave it out of unit coverage.** In `vitest.config.mts`, extend `coverage.exclude`:

```ts
      // Runs only inside Next (unstable_cache); the browser tests cover it.
      exclude: ['src/japa/**/index.ts', 'src/japa/**/*.fixtures.ts', 'src/lib/site/cached.ts'],
```

- [ ] **Step 8: Commit**

```bash
npm run lint && npm run typecheck
git add src/lib/site/cached.ts src/lib/site/metadata.ts tests/helpers/site.ts tests/unit/site-metadata.unit.spec.ts vitest.config.mts
git commit -m "feat: cached public reads and article metadata"
```

---

### Task 11: Fonts, base styles, header, footer and theme toggle

Spec 5.2 to 5.4. Components arrange what `src/lib/site/` gives them. The browser tests in Task 15 cover them.

**Files:**
- Create: `src/styles/fonts.ts`, `src/styles/global.css`
- Create: `src/components/site/SiteHeader.tsx`, `SiteHeader.module.css`, `SiteFooter.tsx`, `SiteFooter.module.css`, `ThemeToggle.tsx`, `ThemeToggle.module.css`
- Modify: `src/app/(frontend)/layout.tsx`, `src/app/(frontend)/page.tsx`

- [ ] **Step 1: Create `src/styles/fonts.ts`**

```ts
import { Literata } from 'next/font/google'

/**
 * Literata for all text, served from the site's own domain (website design 7.2). The latin and
 * latin-ext subsets hold every IAST letter. The variable font covers weights 400 and 500, and its
 * optical-size axis keeps small text sturdy and large text fine.
 */
export const literata = Literata({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  display: 'swap',
  variable: '--font-literata',
})
```

- [ ] **Step 2: Create `src/styles/global.css`**

```css
/* Base styles for the public site (website design 7). Colours and sizes come from tokens.css. */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--font-body);
  font-size: var(--text-ui);
  line-height: 1.5;
  font-optical-sizing: auto;
}

h1,
h2,
h3,
h4 {
  margin: 0;
  font-weight: 500;
  line-height: 1.2;
}

p {
  margin: 0;
}

img {
  display: block;
  max-width: 100%;
  height: auto;
}

a {
  color: var(--accent);
  text-decoration-thickness: 1px;
  text-underline-offset: 0.18em;
}

a:hover {
  text-decoration-thickness: 2px;
}

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 2px;
}

/* The page container and the reading column (website design 7.3). */
.page {
  max-width: var(--page);
  margin-inline: auto;
  padding-inline: var(--gutter);
}

.column {
  max-width: var(--column);
  margin-inline: auto;
}

/* Spaced capitals in the accent colour: topic and shape labels. */
.label {
  font-size: var(--text-label);
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
}

.skip-link {
  position: absolute;
  top: -100px;
  left: var(--gutter);
  z-index: 20;
  padding: 8px 14px;
  background: var(--accent);
  color: var(--on-accent);
}

.skip-link:focus {
  top: 8px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Create `src/components/site/ThemeToggle.tsx`**

```tsx
'use client'

import { useSyncExternalStore } from 'react'

import {
  isTheme,
  otherTheme,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type Theme,
} from '@/lib/site/theme'

import styles from './ThemeToggle.module.css'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/** The reader's choice when there is one, otherwise the device's setting. */
function currentTheme(): Theme {
  const chosen = document.documentElement.dataset.theme
  if (isTheme(chosen)) return chosen
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  window.addEventListener(THEME_CHANGE_EVENT, onChange)
  return () => {
    media.removeEventListener('change', onChange)
    window.removeEventListener(THEME_CHANGE_EVENT, onChange)
  }
}

function choose(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage is blocked: the choice lasts until the reader leaves the page.
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}

/** Switches between light and dark (stage 3 design, 5.3). Its name says which theme it switches to. */
export function ThemeToggle() {
  // Null while rendering on the server: the reader's theme is known only in the browser.
  const theme = useSyncExternalStore(subscribe, currentTheme, () => null)
  const next = theme ? otherTheme(theme) : null
  return (
    <button
      type="button"
      className={styles.toggle}
      aria-label={next ? `Switch to ${next} theme` : 'Switch theme'}
      onClick={() => choose(otherTheme(currentTheme()))}
    >
      <span aria-hidden="true" className={styles.icon} />
    </button>
  )
}
```

Create `src/components/site/ThemeToggle.module.css`:

```css
.toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--rule);
  border-radius: 50%;
  background: transparent;
  color: var(--ink-soft);
  cursor: pointer;
  transition:
    border-color 150ms ease,
    color 150ms ease;
}

.toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* A half-filled circle. */
.icon {
  width: 14px;
  height: 14px;
  border: 1.5px solid currentColor;
  border-radius: 50%;
  background: linear-gradient(90deg, currentColor 50%, transparent 50%);
}
```

- [ ] **Step 4: Create `src/components/site/SiteHeader.tsx`**

```tsx
import Link from 'next/link'

import type { NavigationLink } from '@/lib/site/types'

import styles from './SiteHeader.module.css'
import { ThemeToggle } from './ThemeToggle'

/**
 * The wordmark, the navigation from site settings and the theme toggle (stage 3 design, 5.4).
 * The links are rendered twice: a row on wide screens, and a menu built on <details> under 860px,
 * so the menu works without JavaScript. CSS hides whichever one doesn't apply.
 */
export function SiteHeader({ navigation }: { navigation: NavigationLink[] }) {
  const links = navigation.map((item) => (
    <li key={`${item.path} ${item.label}`}>
      <Link href={item.path}>{item.label}</Link>
    </li>
  ))
  return (
    <header className={styles.header}>
      <div className={`page ${styles.bar}`}>
        <Link href="/" className={styles.wordmark}>
          SageVani
        </Link>
        {links.length > 0 && (
          <nav aria-label="Main" className={styles.nav}>
            <ul className={styles.row}>{links}</ul>
            <details className={styles.menu}>
              <summary>Menu</summary>
              <ul>{links}</ul>
            </details>
          </nav>
        )}
        <ThemeToggle />
      </div>
    </header>
  )
}
```

Create `src/components/site/SiteHeader.module.css`:

```css
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid var(--rule);
  background: var(--paper);
}

.bar {
  display: flex;
  align-items: center;
  gap: 24px;
  height: var(--header-height);
}

.wordmark {
  margin-right: auto;
  font-size: 24px;
  font-style: italic;
  font-weight: 500;
  color: var(--ink);
  text-decoration: none;
}

.nav {
  display: flex;
  align-items: center;
}

.row {
  display: flex;
  gap: 22px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row a,
.menu a,
.menu summary {
  color: var(--ink-soft);
  text-decoration: none;
}

.row a:hover,
.menu a:hover {
  color: var(--accent);
  text-decoration: underline;
}

.menu {
  display: none;
  position: relative;
}

.menu summary {
  padding: 6px 2px;
  list-style: none;
  cursor: pointer;
}

.menu summary::-webkit-details-marker {
  display: none;
}

.menu ul {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  min-width: 200px;
  margin: 0;
  padding: 8px 0;
  list-style: none;
  border: 1px solid var(--rule);
  border-radius: 4px;
  background: var(--surface);
  box-shadow: 0 8px 24px rgb(0 0 0 / 12%);
}

.menu li a {
  display: block;
  padding: 8px 16px;
}

@media (max-width: 859px) {
  .row {
    display: none;
  }

  .menu {
    display: block;
  }

  .wordmark {
    font-size: 21px;
  }
}
```

- [ ] **Step 5: Create `src/components/site/SiteFooter.tsx`**

```tsx
import Link from 'next/link'

import type { SiteChrome } from '@/lib/site/types'

import styles from './SiteFooter.module.css'

/**
 * The wordmark, tagline, footer motto (hidden while empty) and navigation (stage 3 design, 5.4).
 * No licence or copyright line until Q-06 is decided. Links use footer-text, never the accent,
 * which is too faint on the footer's ink.
 */
export function SiteFooter({ chrome }: { chrome: SiteChrome }) {
  return (
    <footer className={styles.footer}>
      <div className={`page ${styles.inner}`}>
        <div>
          <p className={styles.wordmark}>SageVani</p>
          <p>{chrome.tagline}</p>
          {chrome.footerMotto && <p className={styles.motto}>{chrome.footerMotto}</p>}
        </div>
        {chrome.navigation.length > 0 && (
          <nav aria-label="Footer">
            <ul className={styles.links}>
              {chrome.navigation.map((item) => (
                <li key={`${item.path} ${item.label}`}>
                  <Link href={item.path}>{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </footer>
  )
}
```

Create `src/components/site/SiteFooter.module.css`:

```css
.footer {
  margin-top: 72px;
  padding: 40px 0;
  background: var(--footer);
  color: var(--footer-text);
}

.inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.wordmark {
  margin-bottom: 6px;
  font-size: 21px;
  font-style: italic;
  font-weight: 500;
}

.motto {
  margin-top: 10px;
  font-style: italic;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.links a {
  color: var(--footer-text);
}
```

- [ ] **Step 6: Replace `src/app/(frontend)/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { getSiteChrome } from '@/lib/site/cached'
import { siteConfig } from '@/lib/site/config'
import { THEME_SCRIPT } from '@/lib/site/theme'
import { literata } from '@/styles/fonts'

import '@/styles/tokens.css'
import '@/styles/global.css'

export async function generateMetadata(): Promise<Metadata> {
  const { url, indexing } = siteConfig()
  const { tagline } = await getSiteChrome()
  return {
    metadataBase: new URL(url),
    title: { default: 'SageVani', template: '%s · SageVani' },
    description: tagline,
    // Hidden from search engines until launch (stage 3 design, 4.6).
    robots: indexing ? undefined : { index: false, follow: false },
  }
}

export default async function FrontendLayout({ children }: { children: ReactNode }) {
  const chrome = await getSiteChrome()
  return (
    // The theme script sets data-theme before React hydrates, so the attribute differs on purpose.
    <html lang="en" className={literata.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a className="skip-link" href="#content">
          Skip to content
        </a>
        <SiteHeader navigation={chrome.navigation} />
        <main id="content">{children}</main>
        <SiteFooter chrome={chrome} />
      </body>
    </html>
  )
}
```

- [ ] **Step 7: Keep the placeholder home page inside the new layout.** The layout now provides `<main>`, so the page must not add another. Replace `src/app/(frontend)/page.tsx`:

```tsx
/** A placeholder until stage 3b builds the landing page. */
export default function HomePage() {
  return (
    <div className="page column">
      <h1>SageVani</h1>
      <p>Where silence learns to speak.</p>
    </div>
  )
}
```

- [ ] **Step 8: Check the home page in the browser**

Run: `npm run dev`, open <http://localhost:3000>, and confirm:
- the header shows the italic wordmark and the toggle, in the warm paper colours;
- the toggle switches to the dark theme, and a reload keeps it;
- the footer shows the wordmark and the tagline.

Stop the server.

Then run the smoke test: `npx playwright test tests/e2e/smoke.e2e.spec.ts`
Expected: PASS. The title stays "SageVani" and the page's only `h1` is "SageVani".

- [ ] **Step 9: Commit**

```bash
npm run lint && npm run typecheck && npm run format:check
git add src/styles src/components/site "src/app/(frontend)/layout.tsx" "src/app/(frontend)/page.tsx"
git commit -m "feat: fonts, base styles, header, footer and the theme toggle"
```

---

### Task 12: The body renderer and the four layers

Spec 6.1, item 7, with the "Manuscript gloss" design the owner chose. Payload's JSX converters render the body on the server. Links, uploads and the three blocks have their own converters, and every other node keeps Payload's default.

**Files:**
- Create: `src/components/rich-text/RichText.tsx`, `RichText.module.css`, `VerseBlockView.tsx`, `VerseBlock.module.css`, `TraditionBlockView.tsx`, `TraditionBlock.module.css`, `PracticeBlockView.tsx`, `PracticeBlock.module.css`, `devanagari.ts`

- [ ] **Step 1: Create the Devanagari font, `src/components/rich-text/devanagari.ts`**

```ts
import { Tiro_Devanagari_Sanskrit } from 'next/font/google'

/**
 * Tiro Devanagari Sanskrit, declared only here: its @font-face rules load with the verse
 * component, it is never preloaded, and the browser downloads it only for Devanagari text
 * (website design 7.2; stage 3a plan, before you start).
 */
export const devanagari = Tiro_Devanagari_Sanskrit({
  weight: '400',
  subsets: ['devanagari'],
  preload: false,
  display: 'swap',
})
```

- [ ] **Step 2: Create `src/components/rich-text/VerseBlockView.tsx`**

```tsx
import type { VerseBlock } from '@/payload-types'

import { devanagari } from './devanagari'
import styles from './VerseBlock.module.css'

/**
 * The text layer: the verse centred between two rules, with the Devanagari when given, the
 * transliteration, the translation, then where it comes from (stage 3 design, 6.1).
 */
export function VerseBlockView({ fields }: { fields: VerseBlock }) {
  const devanagariText = fields.devanagari?.trim()
  return (
    <figure className={styles.verse}>
      <div className={styles.text}>
        {devanagariText && (
          <p lang="sa-Deva" className={`${styles.devanagari} ${devanagari.className}`}>
            {devanagariText}
          </p>
        )}
        <p lang="sa-Latn" className={styles.transliteration}>
          {fields.transliteration}
        </p>
        <p className={styles.translation}>{fields.translation}</p>
      </div>
      <figcaption className={styles.citation}>
        {fields.textName} {fields.location} · {fields.translator}
      </figcaption>
    </figure>
  )
}
```

Create `src/components/rich-text/VerseBlock.module.css`:

```css
.verse {
  margin: 2.2em 0;
  padding: 1.3em 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  text-align: center;
}

.devanagari {
  margin-bottom: 0.35em;
  font-size: 1.16em;
  line-height: 1.6;
  white-space: pre-line;
}

.transliteration {
  font-style: italic;
  white-space: pre-line;
}

.translation {
  margin-top: 0.6em;
  color: var(--ink-soft);
  white-space: pre-line;
}

.citation {
  margin-top: 0.8em;
  font-size: var(--text-small);
  color: var(--muted);
}
```

- [ ] **Step 3: Create `src/components/rich-text/TraditionBlockView.tsx`**

```tsx
import { paragraphsOf } from '@/lib/site/format'
import type { TraditionBlock } from '@/payload-types'

import styles from './TraditionBlock.module.css'

/** A named tradition's reading, as an indented gloss under its attribution (stage 3 design, 6.1). */
export function TraditionBlockView({ fields }: { fields: TraditionBlock }) {
  return (
    <div className={styles.tradition}>
      <p className={styles.attribution}>As {fields.school} reads it</p>
      <div className={styles.reading}>
        {paragraphsOf(fields.interpretation).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </div>
  )
}
```

Create `src/components/rich-text/TraditionBlock.module.css`:

```css
.tradition {
  margin: 1.8em 0;
}

.attribution {
  margin-bottom: 0.5em;
  font-size: var(--text-small);
  font-style: italic;
  color: var(--muted);
}

.reading {
  padding-left: 1.2em;
  border-left: 1px dotted var(--muted);
}

.reading p + p {
  margin-top: 0.8em;
}
```

- [ ] **Step 4: Create `src/components/rich-text/PracticeBlockView.tsx`**

```tsx
import { paragraphsOf } from '@/lib/site/format'
import type { PracticeBlock } from '@/payload-types'

import styles from './PracticeBlock.module.css'

/** The practice invitation, a centred italic coda (stage 3 design, 6.1). */
export function PracticeBlockView({ fields }: { fields: PracticeBlock }) {
  return (
    <div className={styles.practice}>
      <p className={styles.label}>Practice</p>
      {paragraphsOf(fields.invitation).map((paragraph, index) => (
        <p key={index} className={styles.invitation}>
          {paragraph}
        </p>
      ))}
    </div>
  )
}
```

Create `src/components/rich-text/PracticeBlock.module.css`:

```css
.practice {
  max-width: 34em;
  margin: 2.2em auto;
  padding: 0 1em;
  text-align: center;
}

.label {
  font-size: var(--text-label);
  font-weight: 500;
  letter-spacing: 0.4em;
  text-transform: uppercase;
  color: var(--accent);
}

.invitation {
  margin-top: 0.5em;
  font-style: italic;
}

.invitation + .invitation {
  margin-top: 0.8em;
}
```

- [ ] **Step 5: Create `src/components/rich-text/RichText.tsx`**

```tsx
import type { DefaultNodeTypes, SerializedBlockNode } from '@payloadcms/richtext-lexical'
import {
  RichText as LexicalRichText,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'
import Image from 'next/image'
import type { ReactNode } from 'react'

import { bodyImage, bodyLinkHref } from '@/lib/site/body'
import type { BodyContext, RichTextValue } from '@/lib/site/types'
import type { PracticeBlock, TraditionBlock, VerseBlock } from '@/payload-types'

import { PracticeBlockView } from './PracticeBlockView'
import styles from './RichText.module.css'
import { TraditionBlockView } from './TraditionBlockView'
import { VerseBlockView } from './VerseBlockView'

type NodeTypes = DefaultNodeTypes | SerializedBlockNode<VerseBlock | TraditionBlock | PracticeBlock>

/** A link, or only its text when the address isn't one the page may link to (stage 3 design, 4.2). */
function BodyLink({ href, newTab, children }: { href: string | null; newTab: boolean; children: ReactNode }) {
  if (!href) return <>{children}</>
  return (
    <a href={href} {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      {children}
    </a>
  )
}

const convertersFor =
  (context: BodyContext): JSXConvertersFunction<NodeTypes> =>
  ({ defaultConverters }) => ({
    ...defaultConverters,
    link: ({ node, nodesToJSX }) => (
      <BodyLink href={bodyLinkHref(node.fields, context.links)} newTab={node.fields.newTab === true}>
        {nodesToJSX({ nodes: node.children })}
      </BodyLink>
    ),
    autolink: ({ node, nodesToJSX }) => (
      <BodyLink href={bodyLinkHref(node.fields, context.links)} newTab={node.fields.newTab === true}>
        {nodesToJSX({ nodes: node.children })}
      </BodyLink>
    ),
    upload: ({ node }) => {
      const image = bodyImage(node, context.images)
      if (!image) return null
      return (
        <figure className={styles.figure}>
          <Image
            src={image.url}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes="(max-width: 720px) 100vw, 680px"
          />
        </figure>
      )
    },
    blocks: {
      verse: ({ node }) => <VerseBlockView fields={node.fields} />,
      tradition: ({ node }) => <TraditionBlockView fields={node.fields} />,
      practice: ({ node }) => <PracticeBlockView fields={node.fields} />,
    },
  })

/** An article's or page's body, rendered on the server. */
export function RichText({ data, context }: { data: RichTextValue | null; context: BodyContext }) {
  if (!data) return null
  return <LexicalRichText data={data} converters={convertersFor(context)} className={styles.body} />
}
```

Create `src/components/rich-text/RichText.module.css`:

```css
/* Reflection: ordinary body text, 19px with a 1.7 line height (website design 7.2). */
.body {
  font-size: var(--text-body);
  line-height: var(--leading-body);
}

.body > * + * {
  margin-top: 1.1em;
}

.body h2 {
  margin-top: 1.8em;
  font-size: 1.45em;
}

.body h3 {
  margin-top: 1.6em;
  font-size: 1.2em;
}

.body blockquote {
  margin: 1.4em 0;
  padding-left: 1.2em;
  border-left: 2px solid var(--rule);
  color: var(--ink-soft);
}

.body ul,
.body ol {
  padding-left: 1.3em;
}

.body li + li {
  margin-top: 0.4em;
}

.body hr {
  width: 40%;
  margin: 2.2em auto;
  border: 0;
  border-top: 1px solid var(--rule);
}

.figure {
  margin: 2em 0;
}

.figure img {
  border-radius: 3px;
}
```

- [ ] **Step 6: Type-check the converters**

Run: `npm run typecheck`
Expected: no errors. If `node.fields` on a block is typed too loosely for the block views, check that `NodeTypes` lists the three block interfaces from `@/payload-types`. Their `blockType` values (`verse`, `tradition`, `practice`) key the `blocks` converters.

- [ ] **Step 7: Commit**

```bash
npm run lint && npm run typecheck && npm run format:check
git add src/components/rich-text
git commit -m "feat: render article bodies with the gloss-style Verse, Tradition and Practice blocks"
```

---

### Task 13: The article page

Spec 6.1, in the order the owner approved.

**Files:**
- Modify: `src/lib/site/cover.ts`, `tests/unit/site-cover.unit.spec.ts`
- Create in `src/components/article/`: `Cover.tsx`, `Cover.module.css`, `ArticleCard.tsx`, `ArticleCard.module.css`, `BeforeYouRead.tsx`, `BeforeYouRead.module.css`, `ShareLinks.tsx`, `CopyLinkButton.tsx`, `ShareLinks.module.css`, `Sources.tsx`, `Sources.module.css`, `CorrectionNotes.tsx`, `CorrectionNotes.module.css`, `MoreFromTopic.tsx`, `MoreFromTopic.module.css`, `ReadingProgress.tsx`, `ReadingProgress.module.css`, `ArticleView.tsx`, `ArticleView.module.css`
- Create: `src/app/(frontend)/articles/[slug]/page.tsx`

- [ ] **Step 1: Write the failing test for long cover terms.** When an article has no cover term, the title is drawn instead, and a long title would overflow at the term's size. Append to `tests/unit/site-cover.unit.spec.ts`:

```ts
import { coverTermSize } from '@/lib/site/cover'

describe('coverTermSize', () => {
  it('draws short terms largest, and longer ones smaller', () => {
    expect(coverTermSize('dharma')).toBe('short')
    expect(coverTermSize('Twelve chars')).toBe('short')
    expect(coverTermSize('Thirteen char')).toBe('medium')
    expect(coverTermSize('Karma and the right to act')).toBe('long')
  })

  it('counts letters with diacritics once', () => {
    expect(coverTermSize('ṛtaṃ satyaṃ ś')).toBe('medium')
    expect(coverTermSize('ṛtaṃ satyaṃ')).toBe('short')
  })
})
```

Move the new import up beside the existing one, as `import { coverFor, coverTermSize, NO_TOPIC_TINT } from '@/lib/site/cover'`.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run tests/unit/site-cover.unit.spec.ts`
Expected: FAIL: `coverTermSize` is not exported.

- [ ] **Step 3: Add it to `src/lib/site/cover.ts`**

```ts
export type CoverTermSize = 'short' | 'medium' | 'long'

/** How large to draw a cover's term: up to 12 letters, up to 24, or more. */
export function coverTermSize(term: string): CoverTermSize {
  const length = [...term.normalize('NFC')].length
  return length <= 12 ? 'short' : length <= 24 ? 'medium' : 'long'
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run tests/unit/site-cover.unit.spec.ts`
Expected: PASS.

- [ ] **Step 5: Create the cover, `src/components/article/Cover.tsx`**

```tsx
import Image from 'next/image'
import type { CSSProperties } from 'react'

import { coverTermSize } from '@/lib/site/cover'
import type { CoverData } from '@/lib/site/types'

import styles from './Cover.module.css'

interface CoverProps {
  cover: CoverData
  /** The image's displayed width, for next/image. */
  sizes: string
  /** A card shows the term and the mark; the title sits under the card. */
  variant?: 'full' | 'card'
  /** Load the photo first: the article page's cover is its largest image. */
  preload?: boolean
}

/** Design A: the term centred, the title under it, the mark in the corner (stage 3 design, 5.5). */
export function Cover({ cover, sizes, variant = 'full', preload = false }: CoverProps) {
  if (cover.photo) {
    return (
      <div className={styles.cover}>
        <Image
          src={cover.photo.url}
          alt={cover.photo.alt}
          fill
          sizes={sizes}
          preload={preload}
          className={styles.photo}
        />
      </div>
    )
  }
  const tint = { '--cover-bg': cover.background, '--cover-text': cover.text } as CSSProperties
  return (
    // Drawn from the title and topic, which the page already gives as text.
    <div className={`${styles.cover} ${styles.drawn} ${styles[coverTermSize(cover.term)]}`} style={tint} aria-hidden="true">
      <span className={styles.term}>{cover.term}</span>
      {variant === 'full' && cover.term !== cover.title && (
        <span className={styles.title}>{cover.title}</span>
      )}
      <span className={styles.mark}>SageVani</span>
    </div>
  )
}
```

Create `src/components/article/Cover.module.css`:

```css
/* Every cover has the link-preview shape, 1200 × 630, and scales with its width. */
.cover {
  position: relative;
  aspect-ratio: 1200 / 630;
  overflow: hidden;
  border-radius: 4px;
  container-type: inline-size;
}

.drawn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6cqw;
  background: var(--cover-bg);
  color: var(--cover-text);
  text-align: center;
}

.term {
  font-style: italic;
  font-weight: 400;
  line-height: 1.05;
  overflow-wrap: anywhere;
}

.short .term {
  font-size: 16cqw;
}

.medium .term {
  font-size: 10cqw;
}

.long .term {
  font-size: 6.5cqw;
}

.title {
  max-width: 75%;
  margin-top: 3cqw;
  font-size: 3.6cqw;
  font-weight: 500;
  line-height: 1.25;
}

.mark {
  position: absolute;
  right: 4cqw;
  bottom: 3.5cqw;
  font-size: 2.8cqw;
  font-style: italic;
}

.photo {
  object-fit: cover;
}
```

- [ ] **Step 6: Create the card, `src/components/article/ArticleCard.tsx`**

```tsx
import Link from 'next/link'

import { readingTimeLabel } from '@/lib/site/format'
import { articlePath } from '@/lib/site/metadata'
import type { ArticleCard as Card } from '@/lib/site/types'

import styles from './ArticleCard.module.css'
import { Cover } from './Cover'

/** The cover, title, summary, reading time and difficulty of an article in a list. */
export function ArticleCard({ article }: { article: Card }) {
  const meta = [
    article.readingTime === null ? null : readingTimeLabel(article.readingTime),
    article.difficulty,
  ].filter(Boolean)
  return (
    <article className={styles.card}>
      <Link href={articlePath(article.slug)} className={styles.link}>
        <Cover cover={article.cover} sizes="(max-width: 859px) 100vw, 340px" variant="card" />
        <h3 className={styles.title}>{article.title}</h3>
      </Link>
      {article.summary && <p className={styles.summary}>{article.summary}</p>}
      {meta.length > 0 && <p className={styles.meta}>{meta.join(' · ')}</p>}
    </article>
  )
}
```

Create `src/components/article/ArticleCard.module.css`:

```css
.link {
  display: block;
  color: inherit;
  text-decoration: none;
}

.link:hover .title {
  color: var(--accent);
  text-decoration: underline;
}

.title {
  margin-top: 12px;
  font-size: 18px;
  line-height: 1.3;
}

.summary {
  margin-top: 6px;
  font-size: 14px;
  color: var(--ink-soft);
}

.meta {
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
}
```

- [ ] **Step 7: Create `src/components/article/BeforeYouRead.tsx`**

```tsx
import Link from 'next/link'

import { paragraphsOf } from '@/lib/site/format'
import type { PriorReading } from '@/lib/site/types'

import styles from './BeforeYouRead.module.css'

/** Helpful background and suggested prior reading, shown when either exists (stage 3 design, 6.1). */
export function BeforeYouRead({
  background,
  readFirst,
}: {
  background: string | null
  readFirst: PriorReading[]
}) {
  if (!background && readFirst.length === 0) return null
  return (
    <aside className={styles.box} aria-labelledby="before-you-read">
      <h2 id="before-you-read" className={styles.heading}>
        Before you read
      </h2>
      {paragraphsOf(background).map((paragraph, index) => (
        <p key={index} className={styles.text}>
          {paragraph}
        </p>
      ))}
      {readFirst.length > 0 && (
        <>
          <h3 className={styles.subheading}>Suggested prior reading</h3>
          <ul className={styles.list}>
            {readFirst.map((item, index) => (
              <li key={index}>
                {item.href?.startsWith('/') ? (
                  <Link href={item.href}>{item.title}</Link>
                ) : item.href ? (
                  <a href={item.href}>{item.title}</a>
                ) : (
                  item.title
                )}
                {item.author && `, ${item.author}`}
                {item.reason && <span className={styles.reason}> — {item.reason}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  )
}
```

Create `src/components/article/BeforeYouRead.module.css`:

```css
.box {
  margin: 0 0 32px;
  padding: 20px 24px;
  border: 1px solid var(--rule);
  border-radius: 4px;
  background: var(--surface);
}

.heading {
  margin-bottom: 10px;
  font-size: 16px;
}

.text,
.list {
  font-size: var(--text-ui);
  line-height: 1.6;
}

.text + .text {
  margin-top: 8px;
}

.subheading {
  margin: 16px 0 6px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.list {
  margin: 0;
  padding-left: 18px;
}

.list li + li {
  margin-top: 6px;
}

.reason {
  color: var(--ink-soft);
}
```

- [ ] **Step 8: Create the share links.** `src/components/article/CopyLinkButton.tsx`:

```tsx
'use client'

import { useState } from 'react'

import styles from './ShareLinks.module.css'

type Status = 'idle' | 'copied' | 'failed'

const LABELS: Record<Status, string> = {
  idle: 'Copy link',
  copied: 'Link copied',
  failed: 'Copy failed',
}

/** The one share option that needs JavaScript. The new label is announced. */
export function CopyLinkButton({ url }: { url: string }) {
  const [status, setStatus] = useState<Status>('idle')
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
  }
  return (
    <button type="button" className={styles.button} onClick={copy} aria-live="polite">
      {LABELS[status]}
    </button>
  )
}
```

`src/components/article/ShareLinks.tsx`:

```tsx
import { shareLinks } from '@/lib/site/share'

import { CopyLinkButton } from './CopyLinkButton'
import styles from './ShareLinks.module.css'

/** Copy link, WhatsApp, email and X (stage 3 design, 6.1). The like button joins this row in stage 4. */
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const links = shareLinks(url, title)
  return (
    <section className={styles.share} aria-label="Share this article">
      <span className={styles.label}>Share</span>
      <ul className={styles.list}>
        <li>
          <CopyLinkButton url={url} />
        </li>
        <li>
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </li>
        <li>
          <a href={links.email}>Email</a>
        </li>
        <li>
          <a href={links.x} target="_blank" rel="noopener noreferrer">
            X
          </a>
        </li>
      </ul>
    </section>
  )
}
```

`src/components/article/ShareLinks.module.css`:

```css
.share {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  margin: 40px 0 28px;
  padding: 14px 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  font-size: 14px;
}

.label {
  color: var(--muted);
}

.list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* At least 24px tall, for WCAG 2.2's target size. */
.list a,
.button {
  display: inline-block;
  padding-block: 4px;
  color: var(--ink-soft);
}

.button {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 0.18em;
  cursor: pointer;
}

.list a:hover,
.button:hover {
  color: var(--accent);
}
```

- [ ] **Step 9: Create `src/components/article/Sources.tsx`**

```tsx
import type { SourceEntry, SourceGroup } from '@/lib/site/sources'

import styles from './Sources.module.css'

/** One source: author, work, location, edition, link with its access date, and the claim it supports. */
function SourceLine({ entry }: { entry: SourceEntry }) {
  return (
    <li className={styles.entry}>
      {entry.author ? `${entry.author}, ` : null}
      <cite>{entry.work}</cite>
      {entry.location ? `, ${entry.location}` : null}
      {entry.edition ? `. ${entry.edition}` : null}
      {'.'}
      {entry.href ? (
        <>
          {' '}
          <a href={entry.href} className={styles.url}>
            {entry.href}
          </a>
        </>
      ) : null}
      {entry.accessedOn ? ` (accessed ${entry.accessedOn})` : null}
      {entry.claim ? <span className={styles.claim}>Supports: {entry.claim}</span> : null}
    </li>
  )
}

/**
 * Sources in a list you can collapse, grouped in the handbook's tier order. The format is a
 * proposal until Q-07 is decided (stage 3 design, 6.1); only this component would change.
 */
export function Sources({ groups }: { groups: SourceGroup[] }) {
  if (groups.length === 0) return null
  const count = groups.reduce((total, group) => total + group.entries.length, 0)
  return (
    <details className={styles.sources} open>
      <summary className={styles.summary}>
        <h2 className={styles.heading}>Sources ({count})</h2>
      </summary>
      {groups.map((group) => (
        <section key={group.type} aria-labelledby={`sources-${group.type}`}>
          <h3 id={`sources-${group.type}`} className={styles.group}>
            {group.label}
          </h3>
          <ul className={styles.list}>
            {group.entries.map((entry, index) => (
              <SourceLine key={index} entry={entry} />
            ))}
          </ul>
        </section>
      ))}
    </details>
  )
}
```

`src/components/article/Sources.module.css`:

```css
.sources {
  margin-bottom: 24px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--rule);
}

.summary {
  padding: 6px 0;
  cursor: pointer;
}

.heading {
  display: inline;
  font-size: 17px;
}

.group {
  margin: 16px 0 6px;
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.entry {
  font-size: var(--text-ui);
  line-height: 1.6;
}

.entry + .entry {
  margin-top: 8px;
}

.url {
  overflow-wrap: anywhere;
}

.claim {
  display: block;
  font-size: 14px;
  color: var(--muted);
}
```

- [ ] **Step 10: Create `src/components/article/CorrectionNotes.tsx`**

```tsx
import type { PublicCorrection } from '@/lib/site/types'

import styles from './CorrectionNotes.module.css'

/**
 * Public correction notes, newest first. Stage 3b adds the link to /corrections once that page
 * exists, so no link points at a missing page in the meantime.
 */
export function CorrectionNotes({ corrections }: { corrections: PublicCorrection[] }) {
  if (corrections.length === 0) return null
  return (
    <section className={styles.corrections} aria-label="Corrections">
      {corrections.map((correction, index) => (
        <p key={index} className={styles.note}>
          <strong className={styles.lead}>Correction, {correction.date}.</strong>{' '}
          {correction.change}
        </p>
      ))}
    </section>
  )
}
```

`src/components/article/CorrectionNotes.module.css`:

```css
.corrections {
  margin-bottom: 28px;
}

.note {
  padding: 12px 16px;
  border-left: 2px solid var(--accent);
  background: var(--paper-2);
  font-size: var(--text-ui);
  line-height: 1.6;
}

.note + .note {
  margin-top: 10px;
}

.lead {
  font-weight: 500;
}
```

- [ ] **Step 11: Create `src/components/article/MoreFromTopic.tsx`**

```tsx
import type { ArticleCard as Card, TopicRef } from '@/lib/site/types'

import { ArticleCard } from './ArticleCard'
import styles from './MoreFromTopic.module.css'

/** Up to three other articles from the article's first topic; hidden when there are none. */
export function MoreFromTopic({ topic, articles }: { topic: TopicRef | null; articles: Card[] }) {
  if (!topic || articles.length === 0) return null
  return (
    <section className={styles.more} aria-labelledby="more-from">
      <div className="page">
        <h2 id="more-from" className={styles.heading}>
          More from {topic.name}
        </h2>
        <div className={styles.grid}>
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

`src/components/article/MoreFromTopic.module.css`:

```css
.more {
  margin-top: 16px;
  padding: 36px 0 44px;
  background: var(--paper-2);
}

.heading {
  margin-bottom: 18px;
  font-size: 22px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
}
```

The footer's `margin-top` sits under this band; that's intended.

- [ ] **Step 12: Create the reading-progress line, `src/components/article/ReadingProgress.tsx`**

```tsx
'use client'

import { useEffect, useRef } from 'react'

import { readingProgress } from '@/lib/site/progress'

import styles from './ReadingProgress.module.css'

/** A thin accent line under the sticky header, filling as the reader moves through the body. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = document.getElementById(targetId)
    const line = bar.current
    if (!target || !line) return
    let frame = 0
    const update = (): void => {
      frame = 0
      const { top, height } = target.getBoundingClientRect()
      line.style.transform = `scaleX(${readingProgress(top, height, window.innerHeight)})`
    }
    const schedule = (): void => {
      if (frame === 0) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [targetId])

  return <div ref={bar} className={styles.progress} aria-hidden="true" />
}
```

`src/components/article/ReadingProgress.module.css`:

```css
/* Moves with transform only; no transition when reduced motion is set (global.css). */
.progress {
  position: fixed;
  top: calc(var(--header-height) - 1px);
  right: 0;
  left: 0;
  z-index: 11;
  height: 2px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 80ms linear;
  pointer-events: none;
}
```

- [ ] **Step 13: Create the page's layout, `src/components/article/ArticleView.tsx`**

```tsx
import { RichText } from '@/components/rich-text/RichText'
import { formatDate, readingTimeLabel } from '@/lib/site/format'
import type { ArticleCard, ArticleView as View } from '@/lib/site/types'

import styles from './ArticleView.module.css'
import { BeforeYouRead } from './BeforeYouRead'
import { CorrectionNotes } from './CorrectionNotes'
import { Cover } from './Cover'
import { MoreFromTopic } from './MoreFromTopic'
import { ReadingProgress } from './ReadingProgress'
import { ShareLinks } from './ShareLinks'
import { Sources } from './Sources'

interface ArticleViewProps {
  article: View
  related: ArticleCard[]
  /** The article's full address, for the share links. */
  shareUrl: string
}

/**
 * The article page, top to bottom (stage 3 design, 6.1). Stage 4 adds the like button to the
 * share row and the comments between the correction notes and "More from".
 */
export function ArticleView({ article, related, shareUrl }: ArticleViewProps) {
  const published = formatDate(article.publishedAt)
  const label = [...article.topics.map((topic) => topic.name), article.shapeLabel]
    .filter(Boolean)
    .join(' · ')
  const details = [
    published ? (
      <time key="date" dateTime={article.publishedAt ?? undefined}>
        {published}
      </time>
    ) : null,
    article.readingTime === null ? null : readingTimeLabel(article.readingTime),
    article.difficulty,
  ].filter(Boolean)

  return (
    <>
      <ReadingProgress targetId="article-body" />
      <article className={`page ${styles.article}`}>
        <div className="column">
          <header className={styles.header}>
            {label && <p className="label">{label}</p>}
            <h1 className={styles.title}>{article.title}</h1>
            {article.summary && <p className={styles.summary}>{article.summary}</p>}
            <p className={styles.byline}>
              <span className={styles.author}>Sagevani</span>
              {details.map((detail, index) => (
                <span key={index}>
                  <span aria-hidden="true"> · </span>
                  {detail}
                </span>
              ))}
            </p>
          </header>
          <div className={styles.cover}>
            <Cover cover={article.cover} sizes="(max-width: 720px) 100vw, 680px" preload />
          </div>
          <BeforeYouRead background={article.background} readFirst={article.readFirst} />
          <div id="article-body">
            <RichText data={article.body} context={article.bodyContext} />
          </div>
          <ShareLinks url={shareUrl} title={article.title} />
          <Sources groups={article.sources} />
          <CorrectionNotes corrections={article.corrections} />
        </div>
      </article>
      <MoreFromTopic topic={article.topics[0] ?? null} articles={related} />
    </>
  )
}
```

`src/components/article/ArticleView.module.css`:

```css
.article {
  padding-top: 44px;
}

.title {
  margin: 14px 0 12px;
  font-size: clamp(30px, 5vw, 40px);
  line-height: 1.15;
}

.summary {
  margin-bottom: 16px;
  font-size: 20px;
  line-height: 1.5;
  color: var(--ink-soft);
}

.byline {
  font-size: 14px;
  color: var(--muted);
}

.author {
  font-style: italic;
  font-weight: 500;
  color: var(--ink);
}

.cover {
  margin: 28px 0;
}
```

- [ ] **Step 14: Create the route, `src/app/(frontend)/articles/[slug]/page.tsx`**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArticleView } from '@/components/article/ArticleView'
import { getArticle, getRelatedArticles } from '@/lib/site/cached'
import { siteConfig } from '@/lib/site/config'
import { articleMetadata, articlePath } from '@/lib/site/metadata'
import { isSlug } from '@/lib/site/params'

interface ArticlePageProps {
  params: Promise<{ slug: string }>
}

/**
 * No article is rendered during the build: each renders on its first request and is cached
 * until published content changes (stage 3 design, 4.3).
 */
export function generateStaticParams(): { slug: string }[] {
  return []
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  const article = isSlug(slug) ? await getArticle(slug) : null
  return article ? articleMetadata(article) : {}
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params
  const article = isSlug(slug) ? await getArticle(slug) : null
  if (!article) notFound()
  const topic = article.topics[0]
  const related = topic ? await getRelatedArticles(topic.id, article.id) : []
  return (
    <ArticleView
      article={article}
      related={related}
      shareUrl={`${siteConfig().url}${articlePath(article.slug)}`}
    />
  )
}
```

- [ ] **Step 15: Check an article in the browser**

1. Run `npm run dev` and sign in at <http://localhost:3000/admin>.
2. Create and publish an article with:
   - a topic and a difficulty level;
   - a Verse block with Devanagari, plus a Tradition block and a Practice block;
   - an image;
   - a prior reading, a source and a public correction.

   Every value must be labelled as test content.
3. Open `/articles/<its slug>` and check that:
   - every part appears in the order of spec 6.1;
   - the image loads through `/local-media/`;
   - a reload after an edit-and-publish shows the edit.
4. Delete the test article.
5. Stop the server.

- [ ] **Step 16: Commit**

```bash
npm run lint && npm run typecheck && npm run format:check
npx vitest run tests/unit/site-cover.unit.spec.ts
git add src/lib/site/cover.ts tests/unit/site-cover.unit.spec.ts src/components/article "src/app/(frontend)/articles"
git commit -m "feat: the article page"
```

---

### Task 14: Live preview

Spec 4.4. Staff-only, uncached routes render the latest draft with the public components. Payload's live preview shows them beside the editor.

**Files:**
- Create: `src/components/preview/LivePreviewRefresh.tsx`, `src/components/page/PageView.tsx`, `src/components/page/PageView.module.css`
- Create: `src/app/(frontend)/preview/articles/[id]/page.tsx`, `src/app/(frontend)/preview/pages/[id]/page.tsx`
- Modify: `src/collections/articles/Articles.ts`, `src/collections/Pages.ts`

- [ ] **Step 1: Create `src/components/preview/LivePreviewRefresh.tsx`**

```tsx
'use client'

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'

const subscribeToNothing = () => () => {}

/**
 * Reloads a preview after each save in the admin beside it (stage 3 design, 4.4). Payload posts a
 * message from the admin's origin; the preview runs on the same site, so its own origin is it.
 */
export function LivePreviewRefresh() {
  const router = useRouter()
  const origin = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => null,
  )
  if (!origin) return null
  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={origin} />
}
```

- [ ] **Step 2: Create `src/components/page/PageView.tsx`.** Stage 3b reuses it for `/[slug]`.

```tsx
import { RichText } from '@/components/rich-text/RichText'
import type { PageView as View } from '@/lib/site/types'

import styles from './PageView.module.css'

/** A page's title and body. */
export function PageView({ page }: { page: View }) {
  return (
    <article className={`page ${styles.page}`}>
      <div className="column">
        <h1 className={styles.title}>{page.title}</h1>
        <RichText data={page.body} context={page.bodyContext} />
      </div>
    </article>
  )
}
```

`src/components/page/PageView.module.css`:

```css
.page {
  padding-top: 44px;
}

.title {
  margin-bottom: 24px;
  font-size: clamp(30px, 5vw, 40px);
  line-height: 1.15;
}
```

- [ ] **Step 3: Create the article preview route, `src/app/(frontend)/preview/articles/[id]/page.tsx`**

```tsx
import config from '@payload-config'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { ArticleView } from '@/components/article/ArticleView'
import { LivePreviewRefresh } from '@/components/preview/LivePreviewRefresh'
import { findRelatedArticles } from '@/lib/site/articles'
import { siteConfig } from '@/lib/site/config'
import { articlePath } from '@/lib/site/metadata'
import { findArticlePreview } from '@/lib/site/preview'

export const metadata: Metadata = { title: 'Preview', robots: { index: false, follow: false } }

/**
 * An article's latest draft, for staff only (stage 3 design, 4.4). Reading the request's session
 * makes this route dynamic, so it is never cached; public routes never read drafts.
 */
export default async function ArticlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const article = await findArticlePreview(payload, id, user)
  if (!article) notFound()
  const topic = article.topics[0]
  const related = topic ? await findRelatedArticles(payload, topic.id, article.id) : []
  return (
    <>
      <LivePreviewRefresh />
      <ArticleView
        article={article}
        related={related}
        shareUrl={`${siteConfig().url}${articlePath(article.slug)}`}
      />
    </>
  )
}
```

- [ ] **Step 4: Create the page preview route, `src/app/(frontend)/preview/pages/[id]/page.tsx`**

```tsx
import config from '@payload-config'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { PageView } from '@/components/page/PageView'
import { LivePreviewRefresh } from '@/components/preview/LivePreviewRefresh'
import { findPagePreview } from '@/lib/site/preview'

export const metadata: Metadata = { title: 'Preview', robots: { index: false, follow: false } }

/** A page's latest draft, for staff only (stage 3 design, 4.4). Never cached. */
export default async function PagePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  const page = await findPagePreview(payload, id, user)
  if (!page) notFound()
  return (
    <>
      <LivePreviewRefresh />
      <PageView page={page} />
    </>
  )
}
```

- [ ] **Step 5: Turn on live preview in the admin.** In `src/collections/articles/Articles.ts`, add the import:

```ts
import { PREVIEW_BREAKPOINTS, previewPath } from '../../lib/site/preview-path'
```

and change `admin` to:

```ts
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'shape', '_status', 'updatedAt'],
    // The latest draft in the site's design, beside the editor (stage 3 design, 4.4).
    livePreview: {
      url: ({ data }) => previewPath('articles', data?.id),
      breakpoints: PREVIEW_BREAKPOINTS,
    },
    preview: (doc) => previewPath('articles', doc.id),
  },
```

In `src/collections/Pages.ts`, add `import { PREVIEW_BREAKPOINTS, previewPath } from '../lib/site/preview-path'` and change `admin` to:

```ts
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    livePreview: {
      url: ({ data }) => previewPath('pages', data?.id),
      breakpoints: PREVIEW_BREAKPOINTS,
    },
    preview: (doc) => previewPath('pages', doc.id),
  },
```

- [ ] **Step 6: Regenerate what Payload writes**

Run: `npm run generate:importmap && npm run generate:types && git status --short src`
Expected: the import map reports no new imports (before you start, fact 9). `payload-types.ts` is unchanged, because live preview adds no fields. Commit either file if it did change.

- [ ] **Step 7: Check live preview in the browser**

1. Run `npm run dev` and sign in.
2. Open a draft article, click **Live Preview**, and type in the title. The preview follows within a few seconds.
3. In a private window, open the same `/preview/articles/<id>`: it is a 404.
4. Stop the server.

- [ ] **Step 8: Run the tests and commit**

```bash
npm run lint && npm run typecheck && npm run format:check
npm test
git add src/components/preview src/components/page "src/app/(frontend)/preview" src/collections/articles/Articles.ts src/collections/Pages.ts src/payload-types.ts "src/app/(payload)/admin/importMap.js"
git commit -m "feat: live preview of drafts beside the editor"
```

---

### Task 15: Browser tests

Spec 10, end-to-end. The tests read content seeded once in global setup, then clear `next dev`'s cache through the running server, because it keeps `unstable_cache` entries in `.next/dev` between runs (before you start, fact 5). Tests that change content do it through the admin, inside Next, so the refresh runs.

**Files:**
- Create: `tests/e2e/server.ts`, `tests/e2e/seed-reading.ts`, `tests/e2e/sign-in.ts`, `tests/e2e/reading.e2e.spec.ts`, `tests/e2e/theme.e2e.spec.ts`, `tests/e2e/preview.e2e.spec.ts`, `tests/e2e/refresh.e2e.spec.ts`
- Modify: `playwright.config.ts`, `tests/e2e/global-setup.ts`, `tests/e2e/reset-database.ts`, `.github/workflows/website-ci.yml` (repository root)

- [ ] **Step 1: Share the test server's address.** Create `tests/e2e/server.ts`:

```ts
/** The browser tests' own port, so a dev server on 3000 with the dev database is never reused by mistake. */
export const E2E_PORT = 3100

export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`
```

In `playwright.config.ts`, replace

```ts
// Its own port, so a dev server on 3000 with the dev database is never reused by mistake.
const PORT = 3100
const baseURL = `http://localhost:${PORT}`
```

with

```ts
import { E2E_BASE_URL, E2E_PORT } from './tests/e2e/server'

const PORT = E2E_PORT
const baseURL = E2E_BASE_URL
```

and move that import up beside the file's other imports.

- [ ] **Step 2: Create the content the tests read, `tests/e2e/seed-reading.ts`**

```ts
import type { Payload, RequiredDataFromCollectionSlug } from 'payload'
import sharp from 'sharp'

import type { User } from '../../src/payload-types'
import { image, linkTo, paragraph, practice, richText, tradition, verse } from '../helpers/lexical'

type ArticleFields = Partial<RequiredDataFromCollectionSlug<'articles'>> & {
  title: string
  slug: string
}

/** Navigation for the header and footer, set through the running server in global setup. */
export const E2E_NAVIGATION = [
  { label: 'Articles', path: '/articles' },
  { label: 'About', path: '/about' },
]

/**
 * Published articles for the reading, theme, preview and refresh tests, created through the
 * Local API (outside Next, so nothing is refreshed here). Every value is test content.
 */
export async function seedReading(payload: Payload, owner: User): Promise<void> {
  const beginner = await payload.create({
    collection: 'difficultyLevels',
    data: { name: 'Beginner', order: 1, needsPriorReading: false },
    overrideAccess: true,
  })
  const dharma = await payload.create({
    collection: 'topics',
    data: {
      name: 'Dharma',
      slug: 'dharma',
      question: 'How shall I live?',
      order: 1,
      coverTint: { background: '#e3cfa8', text: '#3d2f1c' },
    },
    overrideAccess: true,
  })
  const data = await sharp({
    create: { width: 1200, height: 630, channels: 3, background: '#9a3b26' },
  })
    .png()
    .toBuffer()
  const photo = await payload.create({
    collection: 'media',
    data: {
      alt: 'A vermilion field',
      creator: 'Sagevani',
      source: 'Made for the browser tests',
      licence: 'Own work',
    },
    file: { data, mimetype: 'image/png', name: 'field.png', size: data.length },
    overrideAccess: true,
  })

  const publish = (fields: ArticleFields) =>
    payload.create({
      collection: 'articles',
      data: {
        shape: 'inquiry-essay',
        difficulty: beginner.id,
        topics: [dharma.id],
        body: richText(paragraph('A short test body.')),
        ...fields,
        _status: 'published',
      },
      overrideAccess: false,
      user: owner,
    })

  const related = await publish({ title: 'A related piece', slug: 'e2e-related-one' })
  await publish({ title: 'Another related piece', slug: 'e2e-related-two' })
  await payload.create({
    collection: 'articles',
    data: { title: 'Only a draft', slug: 'e2e-draft-only' },
    draft: true,
    overrideAccess: true,
  })

  await publish({
    title: 'A test article to read',
    slug: 'e2e-reading',
    summary: 'A test summary for the reading page.',
    coverTerm: 'karma',
    background: 'Some helpful background, written for the test.',
    readFirst: [
      { kind: 'internal', article: related.id, reason: 'It sets the scene.' },
      {
        kind: 'external',
        title: 'A book elsewhere',
        author: 'An author',
        url: 'https://example.org/book',
        reason: 'Wider context.',
      },
    ],
    body: richText(
      paragraph('An opening paragraph of reflection, written for the test.'),
      verse({
        devanagari: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन',
        transliteration: 'karmaṇy evādhikāras te mā phaleṣu kadācana',
        translation: 'A test translation of the verse.',
        textName: 'Bhagavad Gītā',
        location: '2.47',
        translator: 'Test edition',
      }),
      tradition('A named school', 'How that school reads the verse, written for the test.'),
      linkTo('A link to the related piece.', 'articles', related.id),
      image(photo.id),
      practice('A small practice invitation, written for the test.'),
    ),
    sources: [
      { type: 'primary-text', work: 'Bhagavad Gītā', location: '2.47', edition: 'Test edition' },
      {
        type: 'academic',
        work: 'A test study',
        author: 'A scholar',
        url: 'https://example.org/study',
        accessedOn: '2026-10-03',
      },
    ],
    corrections: [
      { date: '2026-10-09', change: 'A public correction for the test.', showPublicNote: true },
      { date: '2026-10-10', change: 'A private note for the test.', showPublicNote: false },
    ],
  })

  const preview = await publish({ title: 'The live title', slug: 'e2e-preview' })
  await payload.update({
    collection: 'articles',
    id: preview.id,
    data: { title: 'The draft title', slug: 'e2e-preview' },
    draft: true,
    overrideAccess: false,
    user: owner,
  })

  await publish({ title: 'Before the edit', slug: 'e2e-publish' })
}
```

- [ ] **Step 3: Seed after the reset.** In `tests/e2e/reset-database.ts`, keep the owner the script creates and seed after the level. Replace the owner's `await payload.create({ … })` with:

```ts
const owner = await payload.create({
  collection: 'users',
  data: { ...E2E_OWNER, role: 'owner' },
  overrideAccess: true,
  context: allowOwnerChange(),
})
```

and add after the `difficultyLevels` create:

```ts
const { seedReading } = await import('./seed-reading')
await seedReading(payload, owner)
```

Also update the file's opening comment to say it seeds the reading content (`seed-reading.ts`).

- [ ] **Step 4: Clear the dev server's cache after seeding.** Replace `tests/e2e/global-setup.ts`:

```ts
import { execFileSync } from 'child_process'
import path from 'path'

import { E2E_DATABASE_URL } from './database'
import { E2E_OWNER } from './owner'
import { E2E_NAVIGATION } from './seed-reading'
import { E2E_BASE_URL } from './server'

/**
 * Resets and seeds the test database through tsx, then saves site settings through the running
 * server. That save runs inside Next, so it expires every cached public read: next dev keeps
 * unstable_cache entries in .next/dev between runs, and the seed itself runs outside Next.
 */
export default async function globalSetup(): Promise<void> {
  execFileSync(
    process.execPath,
    [path.resolve('node_modules/tsx/dist/cli.mjs'), 'tests/e2e/reset-database.ts'],
    {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL, NODE_OPTIONS: '--no-deprecation' },
    },
  )
  await saveSettingsThroughTheSite()
}

async function saveSettingsThroughTheSite(): Promise<void> {
  const login = await fetch(`${E2E_BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_OWNER.email, password: E2E_OWNER.password }),
  })
  if (!login.ok) throw new Error(`The test owner could not sign in: ${login.status}`)
  const { token } = (await login.json()) as { token?: string }
  const saved = await fetch(`${E2E_BASE_URL}/api/globals/siteSettings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify({ navigation: E2E_NAVIGATION }),
  })
  if (!saved.ok) throw new Error(`Saving site settings through the site failed: ${saved.status}`)
}
```

- [ ] **Step 5: Add a sign-in helper, `tests/e2e/sign-in.ts`**

```ts
import { expect, type Page } from '@playwright/test'

import { E2E_OWNER } from './owner'

export async function signInAsOwner(page: Page): Promise<void> {
  await page.goto('/admin/login')
  await page.locator('input[name="email"]').fill(E2E_OWNER.email)
  await page.locator('input[name="password"]').fill(E2E_OWNER.password)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/admin\/?$/)
}

/** A published article's id, read through the public REST API. */
export async function publishedArticleId(page: Page, slug: string): Promise<number> {
  const response = await page.request.get(`/api/articles?where[slug][equals]=${slug}&depth=0`)
  const { docs } = (await response.json()) as { docs: { id: number }[] }
  if (!docs[0]) throw new Error(`No published article "${slug}"`)
  return docs[0].id
}
```

- [ ] **Step 6: Write the reading tests, `tests/e2e/reading.e2e.spec.ts`**

```ts
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WIDTHS = [320, 375, 768, 1024, 1440, 1920]
const THEMES = ['light', 'dark'] as const

const loadedTiroFaces = (page: Page): Promise<number> =>
  page.evaluate(async () => {
    await document.fonts.ready
    return [...document.fonts].filter((face) => face.status === 'loaded' && face.family.includes('Tiro'))
      .length
  })

test.describe('reading an article', () => {
  // The first visit compiles the route, which is slow on a cold CI runner.
  test.setTimeout(180_000)

  test('shows every part of the article page, in order', async ({ page }) => {
    const response = await page.goto('/articles/e2e-reading')
    expect(response?.status()).toBe(200)

    const article = page.getByRole('article').first()
    const head = article.locator('header').first()
    await expect(head.getByRole('heading', { level: 1 })).toHaveText('A test article to read')
    await expect(head).toContainText('Dharma · Inquiry Essay')
    await expect(head).toContainText('Sagevani')
    await expect(head).toContainText('min read')
    await expect(head).toContainText('Beginner')

    const before = page.getByRole('complementary', { name: 'Before you read' })
    await expect(before.getByRole('link', { name: 'A related piece' })).toHaveAttribute(
      'href',
      '/articles/e2e-related-one',
    )
    await expect(before.getByRole('link', { name: 'A book elsewhere' })).toHaveAttribute(
      'href',
      'https://example.org/book',
    )

    const body = page.locator('#article-body')
    await expect(body.locator('[lang="sa-Deva"]')).toHaveText('कर्मण्येवाधिकारस्ते मा फलेषु कदाचन')
    await expect(body.locator('[lang="sa-Latn"]')).toHaveText(
      'karmaṇy evādhikāras te mā phaleṣu kadācana',
    )
    await expect(body.getByText('As A named school reads it')).toBeVisible()
    await expect(body.getByText('Practice', { exact: true })).toBeVisible()
    await expect(body.getByRole('link', { name: 'A link to the related piece.' })).toHaveAttribute(
      'href',
      '/articles/e2e-related-one',
    )
    const image = body.locator('img')
    await expect(image).toHaveAttribute('alt', 'A vermilion field')
    await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0)

    await expect(page.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/)
    await expect(page.getByRole('button', { name: 'Copy link' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Primary text' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Academic' })).toBeVisible()
    await expect(page.getByText('Correction, 9 October 2026.')).toBeVisible()
    await expect(page.getByText('A private note for the test.')).toHaveCount(0)

    const more = page.getByRole('region', { name: 'More from Dharma' })
    await expect(more.getByRole('link', { name: 'A related piece', exact: true })).toBeVisible()
    await expect(more.getByRole('link', { name: 'A test article to read' })).toHaveCount(0)

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })

  test('loads the Devanagari font only where a verse needs it', async ({ page }) => {
    await page.goto('/articles/e2e-reading')
    expect(await loadedTiroFaces(page)).toBeGreaterThan(0)
    await page.goto('/articles/e2e-related-one')
    expect(await loadedTiroFaces(page)).toBe(0)
  })

  test('answers 404 for a draft, an unknown slug and a malformed one', async ({ page }) => {
    for (const slug of ['e2e-draft-only', 'no-such-article', 'Not_A_Slug']) {
      const response = await page.goto(`/articles/${slug}`)
      expect(response?.status(), slug).toBe(404)
    }
  })

  test('passes axe checks in both themes', async ({ page }) => {
    for (const colorScheme of THEMES) {
      await page.emulateMedia({ colorScheme })
      await page.goto('/articles/e2e-reading')
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(results.violations, `${colorScheme}: ${JSON.stringify(results.violations, null, 2)}`).toEqual([])
    }
  })

  test('screenshots at every test width in both themes', async ({ page }, testInfo) => {
    for (const colorScheme of THEMES) {
      await page.emulateMedia({ colorScheme })
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/articles/e2e-reading')
        await page.evaluate(() => document.fonts.ready)
        // Saved for review as a CI artifact; not compared pixel by pixel (spec 10).
        await page.screenshot({
          path: testInfo.outputPath(`article-${colorScheme}-${width}.png`),
          fullPage: true,
        })
      }
    }
  })
})
```

- [ ] **Step 7: Write the theme tests, `tests/e2e/theme.e2e.spec.ts`**

```ts
import { expect, test, type Page } from '@playwright/test'

const DARK_PAPER = 'rgb(26, 23, 20)'
const LIGHT_PAPER = 'rgb(244, 239, 228)'

const background = (page: Page): Promise<string> =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor)

test.describe('the theme', () => {
  test.setTimeout(120_000)

  test('follows the device, switches on request, and keeps the choice', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/articles/e2e-related-one')
    expect(await background(page)).toBe(DARK_PAPER)

    await page.getByRole('button', { name: 'Switch to light theme' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    expect(await background(page)).toBe(LIGHT_PAPER)

    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    expect(await background(page)).toBe(LIGHT_PAPER)
    await expect(page.getByRole('button', { name: 'Switch to dark theme' })).toBeVisible()
  })

  test('applies the stored choice from a script in the head, before the page renders', async ({
    request,
  }) => {
    const html = await (await request.get('/articles/e2e-related-one')).text()
    const head = html.slice(0, html.indexOf('</head>'))
    expect(head).toContain("localStorage.getItem('sagevani-theme')")
  })
})
```

- [ ] **Step 8: Write the live preview tests, `tests/e2e/preview.e2e.spec.ts`**

```ts
import { expect, test } from '@playwright/test'

import { publishedArticleId, signInAsOwner } from './sign-in'

test.describe('live preview', () => {
  test.setTimeout(180_000)

  test('is a 404 for anyone not signed in', async ({ page }) => {
    const id = await publishedArticleId(page, 'e2e-preview')
    const response = await page.goto(`/preview/articles/${id}`)
    expect(response?.status()).toBe(404)
    await expect(page.getByText('The draft title')).toHaveCount(0)
  })

  test('shows the owner the draft beside the editor, and follows each autosave', async ({
    page,
  }) => {
    const id = await publishedArticleId(page, 'e2e-preview')
    await signInAsOwner(page)
    await page.goto(`/admin/collections/articles/${id}`)
    await page.getByRole('button', { name: 'Live Preview' }).click()

    const preview = page.frameLocator('iframe')
    await expect(preview.getByRole('heading', { level: 1, name: 'The draft title' })).toBeVisible({
      timeout: 60_000,
    })
    await page.getByRole('textbox', { name: 'Title *' }).fill('The draft title, edited')
    await expect(
      preview.getByRole('heading', { level: 1, name: 'The draft title, edited' }),
    ).toBeVisible({ timeout: 30_000 })

    // The public page still shows the published title while the draft waits.
    const reader = await page.context().newPage()
    await reader.goto('/articles/e2e-preview')
    await expect(reader.getByRole('heading', { level: 1 })).toHaveText('The live title')
  })
})
```

- [ ] **Step 9: Write the refresh test, `tests/e2e/refresh.e2e.spec.ts`**

```ts
import { expect, test } from '@playwright/test'

import { publishedArticleId, signInAsOwner } from './sign-in'

test('a draft leaves the public page alone, and publishing updates it', async ({ page }) => {
  test.setTimeout(180_000)
  const reader = await page.context().newPage()
  const heading = reader.getByRole('heading', { level: 1 })

  // Read it first, so the page and its data are cached before the edit.
  await reader.goto('/articles/e2e-publish')
  await expect(heading).toHaveText('Before the edit')

  const id = await publishedArticleId(page, 'e2e-publish')
  await signInAsOwner(page)
  await page.goto(`/admin/collections/articles/${id}`)
  const autosaved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' &&
      response.url().includes(`/api/articles/${id}`) &&
      response.url().includes('autosave=true'),
  )
  await page.getByRole('textbox', { name: 'Title *' }).fill('After the edit')
  await autosaved

  await reader.reload()
  await expect(heading).toHaveText('Before the edit')

  await page.getByRole('button', { name: 'Publish changes' }).click()
  await expect(page.getByText(/Status:\s*Published/).first()).toBeVisible()

  await reader.reload()
  await expect(heading).toHaveText('After the edit')
})
```

- [ ] **Step 10: Run the browser tests**

Run: `npm run test:e2e`
Expected: PASS, including the existing smoke and publish tests. Screenshots are in `test-results/`.

If axe reports a violation, fix the component, not the test. If it is a colour-contrast violation on a value from parent spec 7.1, stop and report it to the owner with the pair and its measured ratio: the tokens were approved.

- [ ] **Step 11: Upload the screenshots in CI.** In `.github/workflows/website-ci.yml` (repository root), after the `Browser smoke tests` step, add:

```yaml
      - name: Keep the browser tests' screenshots
        if: always() && github.event_name == 'pull_request'
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7.0.1
        with:
          name: browser-test-results
          path: website/test-results/
          retention-days: 14
          if-no-files-found: ignore
```

`v7.0.1` (2026-04-10) is pinned by commit like the other actions. `v7.0.2` came out four days before this plan was written, too recently to adopt.

- [ ] **Step 12: Commit**

```bash
npm run lint && npm run typecheck && npm run format:check
git add tests/e2e playwright.config.ts ../.github/workflows/website-ci.yml
git commit -m "test: browser tests for reading, the theme, live preview and refresh"
```

---

### Task 16: Documents

**Files:**
- Modify: `docs/specs/2026-10-05-sagevani-website-design.md`, `docs/environments.md`
- Modify (repository root): `CHANGELOG.md`, `docs/operations/tasks.md`

- [ ] **Step 1: The parent spec.**
  - In the header, after the stage 2 plan link, add the stage 3a plan: `[stage 3a — the reading experience](../plans/2026-10-11-stage-3a-reading-experience.md)`.
  - In section 4, under **Repository layout**, add the lines `src/styles/ design tokens, fonts and base styles` and `src/lib/site/ the public data layer and its helpers`.
  - In section 6.1, add these rows to the route table, after `/og/[slug]`:

    ```markdown
    | `/preview/articles/[id]`, `/preview/pages/[id]` | Live preview of the latest draft, for staff only; never cached ([stage 3 design](2026-10-11-stage-3-public-site-design.md), 4.4) |
    | `/local-media/[file]` | Uploads while storage is off, in development and CI only |
    ```

  - In section 8.2, replace the preview bullet with: `- Live preview shows the latest draft in the site's design beside the editor, refreshing on each autosave ([stage 3 design](2026-10-11-stage-3-public-site-design.md), 4.4).`
  - In section 12, under **SEO**, add: `- every page says noindex until SITE_INDEXING is on, at launch ([stage 3 design](2026-10-11-stage-3-public-site-design.md), 4.6)`.
  - In section 14, add a bullet: `- **Site address:** SITE_URL gives canonical, link-preview and share links their address, and SITE_INDEXING=on lets search engines index the site at launch.`

- [ ] **Step 2: The environments guide.**
  - In **Variables**, add two rows:

    ```markdown
    | `SITE_URL` | The app | The site's address, such as `https://<site>.netlify.app` until the domain is bought. No path or trailing slash. Not set locally |
    | `SITE_INDEXING` | The app | `on` to let search engines index the site. Leave it unset until launch |
    ```

  - Under the rules, add:
    - `- **SITE_URL is required on hosted sites.** A page that renders without it fails, so a deploy without it fails its build. The owner's scripts don't need it.`
    - `- **Apply a pull request's migrations to staging before its preview builds.** From stage 3, the build renders pages from the database, so a preview whose migration isn't applied fails to build. Apply it, then retry the deploy.`
  - In **4. Connect Netlify**, add a row to the variables table:

    ```markdown
    | `SITE_URL` | The production address | The production address (previews are private and never indexed) |
    ```

- [ ] **Step 3: `CHANGELOG.md`** (repository root). Add at the top, under `# Change log`:

```markdown
## 2026-10-12 — Website stage 3a: the reading experience

- Published articles have a public page at `/articles/[slug]`, in the "Manuscript" design: Literata, warm paper and a lamp-lit dark theme that follows the device, with a toggle that remembers the choice and never flashes the wrong theme.
- The article page shows the topic and shape, the byline, a generated cover (or the cover photo), the Before you read box, the body with the Verse, Tradition and Practice blocks in the gloss style, share links, sources grouped by tier, public correction notes, and three more articles from the topic. The sources format is a proposal until Q-07 is decided.
- Public pages read only published content, as an anonymous visitor, and never staff-only fields. Links to anything unpublished show as plain text, and only http, https, mailto and on-site addresses become links.
- Pages are cached and refresh when published content changes: a publish, an unpublish, a deletion, or an edit to topics, levels, site settings or an image. Saving a draft never refreshes anything.
- Live preview shows the latest draft beside the editor and follows each autosave. The preview routes are staff-only and never cached.
- Every page says `noindex` until `SITE_INDEXING=on` at launch. `SITE_URL` gives links their address and is required on hosted sites.
- Fixed: an edit through the API that left out the slug re-derived it from the new title, which would have moved a published URL.
- The landing, archive, topic and fixed pages, and link-preview images, follow in stage 3b.
```

- [ ] **Step 4: `docs/operations/tasks.md`** (repository root).
  - Replace `- [ ] Build website stage 2 (pull request open as a draft).` with `- [x] Build website stage 2 (content model and admin): [pull request #13](https://github.com/shashesh/sagevani/pull/13), merged on 2026-10-12.`
  - Add after it:

    ```markdown
    - [x] Plan website stage 3 (the public site): [design](../../website/docs/specs/2026-10-11-stage-3-public-site-design.md), [3a plan](../../website/docs/plans/2026-10-11-stage-3a-reading-experience.md).
    - [ ] Build website stage 3a (the reading experience; pull request open as a draft).
    - [ ] Owner: set `SITE_URL` in Netlify for production and previews (environments guide) before stage 3a merges.
    - [ ] Plan and build website stage 3b (landing, archive, topic and fixed pages, link-preview images).
    ```

  - Change the closing paragraph's "Stage 1 (foundation) is merged" sentence to: `Stages 1 and 2 are merged, and stage 3a is in review. The site awaits the owner's Supabase and Netlify setup.`

- [ ] **Step 5: Commit**

```bash
cd .. && git add website/docs/specs/2026-10-05-sagevani-website-design.md website/docs/environments.md CHANGELOG.md docs/operations/tasks.md && cd website
git commit -m "docs: stage 3a in the website spec, the environments guide and the records"
```

---

### Task 17: Full verification and the draft pull request

- [ ] **Step 1: Run every check CI runs**

```bash
npm run lint && npm run format:check && npm run typecheck && npm run test:coverage
```

Expected: PASS, with coverage at 80% or more on every measure.

- [ ] **Step 2: Build as a production deploy does, on a fresh database**

```bash
docker exec sagevani-db-1 psql -U postgres -c "DROP DATABASE IF EXISTS sagevani_deploy" -c "CREATE DATABASE sagevani_deploy"
DATABASE_MIGRATION_URL=postgres://postgres:postgres@127.0.0.1:54329/sagevani_deploy npm run deploy:build
```

Expected: the migrations apply, and `next build` lists `/articles/[slug]` as `●` (SSG) with no pages generated, and the preview routes as `ƒ` (dynamic).

- [ ] **Step 3: Check caching and refresh in a production build.** `next dev` doesn't cache pages, so check once with `next start`. Use the dev database, which `npm run dev` built.

1. `npm run build && npx next start --port 3200`.
2. Sign in at <http://localhost:3200/admin> and publish a test article.
3. `curl -sI http://localhost:3200/articles/<slug> | grep -i x-nextjs-cache` twice. Expected: `MISS`, then `HIT`.
4. Edit the title in the admin and publish.
5. Curl again. Expected: `MISS`, and the body shows the new title.
6. Save a draft. A curl gives `HIT` with the published title.
7. Delete the test article, then stop the server. Check port 3200 is free (before you start, fact 10).

- [ ] **Step 4: Run the browser tests once more**

Run: `npm run test:e2e`
Expected: PASS.

- [ ] **Step 5: Code review.** Review the whole branch against the spec and this plan (`superpowers:requesting-code-review`). Fix what it finds, and add any change to "Changes after the final review" below.

- [ ] **Step 6: Push and open a draft pull request**

```bash
git push -u origin feat/website-stage-3
gh pr create --draft --base master --title "Website stage 3a: the reading experience" --body-file /tmp/stage-3a-pr.md
```

Write `/tmp/stage-3a-pr.md` first. The body:
- **What:** the CHANGELOG entry.
- **Owner setup before the preview works:**
  - **[OWNER]** apply this branch's migrations to staging; 3a adds none.
  - **[OWNER]** set `SITE_URL` for previews.
- **Checks:**
  - lint, format, typecheck, unit and integration tests with coverage;
  - deploy build;
  - browser tests;
  - the local production check in step 3;
  - **[OWNER]** on a deploy preview, once Netlify is connected:
    - the deploy log shows `@netlify/plugin-nextjs` 5.16.2 or later (spec 4.3);
    - publishing updates the live page;
    - images load through the image CDN.

    Leave this unticked until it is done.
- **Notes:** the owner's interface wording to approve (spec 9), and the open decisions this touches: Q-01 labels, Q-07 citation format, Q-06 licence line.

End the body with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Expected: a draft pull request URL. Don't request a Copilot review; the owner does that.

---

## Notes for stage 3b

- **Corrections link.** `CorrectionNotes` gets its "All corrections" link to `/corrections` once that page exists.
- **Pages.** `/[slug]` and `/start-here` reuse `PageView` and `toPageView`; add a `findPublishedPage(payload, slug)` beside them in `src/lib/site/pages.ts`, and a cached wrapper in `cached.ts`.
- **Link previews.** `/og/[slug]` makes `articleMetadata` offer an image for every article: add it where `images` is undefined today.
- **The refresh runs before Payload commits.** `afterChange` runs inside the save's transaction, so a request landing in the few milliseconds between the refresh and the commit could cache the old content again, until the next change. The window is tiny on a site this size. Revisit if it is ever seen.
- **Fonts.** Literata's italic files are preloaded on every page, though few pages show italic above the fold (before you start, fact 7). Measure in stage 6's performance pass before changing it.

## Self-review against the spec

| Spec section | Task |
| --- | --- |
| 3 Delivery, 3a's contents | 1–17 |
| 4.1 Routes for 3a: article, preview, local media | 6, 13, 14 |
| 4.2 Public reads: anonymous, select and depth, images, link safety | 5, 9 |
| 4.3 Caching and refresh | 8, 10, 15, 17 |
| 4.4 Live preview | 14, 15 |
| 4.5 Images | 6, 12, 13 |
| 4.6 Site address and indexing | 2, 11, 16 |
| 4.7 Styling and code layout | 4, 11 |
| 5.1 Tokens and contrast | 4 |
| 5.2 Fonts | 11, 12, 15 |
| 5.3 Theme | 5, 11, 15 |
| 5.4 Layout, header, footer | 11 |
| 5.5 Covers | 5, 13 |
| 5.6 Dates and labels | 5 |
| 6.1 Article page | 12, 13, 15 |
| 8 Errors: refresh failures, deleted images | 8, 9 |
| 9 Placeholder interface copy | 11–13 (headings), noted in the pull request |
| 10 Testing | every task; 15 for the browser |
| 12 Documents | 16 |

## Changes after the final review

None yet.
