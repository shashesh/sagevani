# SageVani website — Stage 2 (Content model and admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The owner can write and publish articles in the admin: content collections, the Verse, Tradition and Practice blocks, the publish rules, the approval record and image storage. The assistant saves drafts through its API key and can never publish, unpublish or delete.

**Architecture:**

- **Collections:** `articles` and `pages` have drafts and versions. `topics` and `difficultyLevels` are plain collections. `media` is an upload collection. `siteSettings` is a global.
- **The drafts-only guard** is a `beforeOperation` hook on `articles`, the only place that sees Payload's `draft` flag.
- **Server-written fields** (`approval`, `publishedAt`, `readingTime`, `searchText`, the email record) deny every API write through field access and are set by `beforeChange` hooks. The approved version's id is written by an `afterChange` hook, after Payload has saved the version.
- **Pure logic** (slugs, text extraction, publish rules, storage settings) lives in `src/lib/` with unit tests. Hooks wire it to Payload.
- **Media storage:** media goes to Supabase Storage through `@payloadcms/storage-s3` when the database isn't local, and to a gitignored folder otherwise.

**Tech Stack:** Payload 3.90.2 (`@payloadcms/richtext-lexical`, `@payloadcms/storage-s3` 3.90.2), Next.js 16.3.8, TypeScript 5.7, Postgres 17, Zod 4, sharp, Vitest 4, Playwright 1.58.

**Spec:** [`../specs/2026-10-08-stage-2-content-model-design.md`](../specs/2026-10-08-stage-2-content-model-design.md), which builds on [the website design](../specs/2026-10-05-sagevani-website-design.md) sections 5, 8 and 16.

---

## Before you start

- **Verified in advance.** On 2026-10-08, a spike against Payload 3.90.2 and a real Postgres 17 ran the risky parts of this plan:
  - the drafts-only guard, through the real REST API with a real assistant API key;
  - the approval record;
  - upload renaming, resizing, metadata stripping, SVG refusal and the size limit;
  - migration generation, plus a data migration;
  - the admin screens the end-to-end test drives.

  These facts from that run are built into the tasks:
  1. Payload's REST endpoints parse `?draft=true` into a boolean `draft` operation argument. Only `beforeOperation` hooks see it; `beforeChange` hooks don't. The guard is therefore a `beforeOperation` hook. In that hook, a version restore arrives as operation `restoreVersion`, a duplicate as `create` with `duplicateFromID`, and a bulk update as `update` with no `id`.
  2. Field access removes client-sent values during `beforeValidate`. That is **before** the collection's `beforeChange` hooks run. A field with `access: { create: nobody, update: nobody }` is therefore unwritable through the API, but a `beforeChange` hook can still set it.
  3. `afterChange` runs after Payload saves the version. The newest version is the one just saved. `req.payload.db.updateOne` with partial data changes only those columns and creates no new version.
  4. Any `resizeOptions` on an upload collection makes Payload re-encode the original through sharp. With `withMetadata` unset, that drops EXIF data, including GPS.
  5. SVG is refused when it's not in `mimeTypes` ("The following field is invalid: file"). An upload over `upload.limits.fileSize` through REST gets `413 File size limit has been reached`.
  6. The S3 adapter must have `alwaysInsertFields: true`. Without it, the adapter's `prefix` column exists only where the adapter is switched on, so migrations generated locally would not match production.
  7. `npm run payload -- migrate:create <name> --force-accept-warning` creates a blank migration without a prompt and adds it to `src/migrations/index.ts`. Inside a migration, `payload.create({ …, req })` writes within the migration's transaction.
  8. With autosave on, opening `/admin/collections/articles/create` saves a draft at once and moves to `/admin/collections/articles/<id>`. The end-to-end test relies on these admin selectors:
     - the title textbox `Title *`;
     - the button `Publish changes`;
     - the slash-menu options `Verse` and `Upload`;
     - block inputs `#field-transliteration`, `#field-translation`, `#field-textName`, `#field-location` and `#field-translator`;
     - in the media drawer, the button `Add new Media`, the hidden `input[type="file"]`, `#field-alt`, `#field-creator`, `#field-source`, `#field-licence` and the button `Save`;
     - select and relationship fields: click `#field-<name>`, then the option by name;
     - an array row field: `input[name="readFirst.0.title"]`;
     - the approval: `#field-approval__versionId`;
     - the login form: `input[name="email"]`, `input[name="password"]` and the button `Login`.

     A publish blocked by a `ValidationError` shows the rule's message next to the field, array fields such as `readFirst` included, and the status stays `Draft`. A `ValidationError`'s own `message` is generic ("The following field is invalid: slug"); the rule's wording is in `error.data.errors`, which the tests read.
  9. Playwright starts `webServer` **before** `globalSetup`, and merges `webServer.env` over `process.env`.
- **Shell.** Commands use Git Bash syntax. Run them from `website/` unless a step says otherwise.
- **Docker Desktop must be running**, then run `npm run db:up`.
- **Stale local test database.** If an integration test run stops at a schema-push prompt because your local test database carries tables from another branch, run `npm run db:reset`. That wipes both local databases.
- **Owner-only steps** are marked **[OWNER]**. Don't perform them without the owner's go-ahead.
- **Commit messages** use the repository's conventional format (`feat:`, `test:`, `chore:`, `docs:`), with no attribution trailer.
- **Before every commit that contains code,** run `npm run lint && npm run typecheck`, plus the tests named in the task.
- **Generated files.** After a task changes a collection, run `npm run generate:types`. After it changes admin components (the editor, uploads, the storage adapter), run `npm run generate:importmap`. Commit what they write: `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js`.

## File map

| Path | Responsibility |
| --- | --- |
| `src/access/roles.ts` | Adds `isStaff`, `staffOnly`, `staffOnlyField`, `nobody`, `anyone`, `publishedOrStaff` |
| `src/lib/slug.ts` | `foldDiacritics`, `slugify` |
| `src/lib/rich-text.ts` | `extractText`, `countWords`, `findUploadIds` over serialized Lexical |
| `src/lib/article-text.ts` | `readingTime`, `searchTextFrom` |
| `src/lib/publish-rules.ts` | `publishProblems`: the publish rules as a pure function |
| `src/lib/media-storage.ts` | Storage settings from the environment, and the S3 adapter's options |
| `src/lib/env.ts` | Adds the six media storage variables and their rules |
| `src/blocks/Verse.ts`, `Tradition.ts`, `Practice.ts` | The editor blocks |
| `src/blocks/content-editor.ts` | The editor for article and page bodies |
| `src/collections/shared/slug.ts` | `slugField`, `deriveSlug`, `checkSlug` hooks shared by articles, pages and topics |
| `src/collections/Media.ts` | The `media` upload collection and `randomFileName` |
| `src/collections/Topics.ts`, `DifficultyLevels.ts`, `Pages.ts` | Those collections |
| `src/collections/articles/Articles.ts` | The `articles` collection |
| `src/collections/articles/drafts-only.ts` | The drafts-only guard |
| `src/collections/articles/derived-text.ts` | Reading time and search text on save |
| `src/collections/articles/publish-rules.ts` | Gathers what the rules need and throws a `ValidationError` |
| `src/collections/articles/approval.ts` | The approval record |
| `src/collections/articles/editorial-checklist.ts` | The checklist field, mirroring `templates/editorial-review.md` |
| `src/globals/SiteSettings.ts` | The `siteSettings` global |
| `src/payload.config.ts` | Registers everything, the upload limit and the storage adapter |
| `src/migrations/*_stage_2_content.ts`, `*_starting_data.ts` | The schema migration (generated) and the starting data |
| `tests/helpers/content.ts`, `tests/helpers/lexical.ts` | Integration-test helpers: REST calls, staff accounts, clearing, editor content |
| `tests/unit/*.unit.spec.ts`, `tests/int/*.int.spec.ts` | Tests, per task |
| `tests/e2e/database.ts`, `owner.ts`, `reset-database.ts`, `global-setup.ts`, `publish-article.e2e.spec.ts` | Browser test against the test database |
| `playwright.config.ts` | Port 3100, the test database, global setup |
| `.gitignore`, `.env.example`, `docs/environments.md` | Uploads folder, new variables, owner setup |
| `CHANGELOG.md`, `docs/operations/tasks.md` (repository root) | Records |

---

### Task 1: The storage adapter dependency and the uploads folder

**Files:**
- Modify: `website/package.json`, `website/package-lock.json`, `website/.gitignore`

- [ ] **Step 1: Install the adapter at Payload's exact version**

```bash
npm install --save-exact @payloadcms/storage-s3@3.90.2
grep -n '"@payloadcms/storage-s3"' package.json
```

Expected: `"@payloadcms/storage-s3": "3.90.2",`. `npm audit --omit=dev` lists the same `braces` advisory that master already carries through `@payloadcms/next`, now also reached through `@payloadcms/plugin-cloud-storage`. It's build-time tooling, not reachable by readers.

- [ ] **Step 2: Ignore local uploads.** Append to `website/.gitignore`:

```gitignore

# Media uploaded in development and tests (Supabase Storage holds the real ones)
/uploads/
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: add the S3 storage adapter and ignore local uploads"
```

### Task 2: Access helpers

**Files:**
- Modify: `src/access/roles.ts`
- Test: `tests/unit/roles.unit.spec.ts`

- [ ] **Step 1: Write the failing tests.** In `tests/unit/roles.unit.spec.ts`, replace the import line:

```ts
import { isOwner, ownerOnly, ownerOnlyField, ownerOrOwnAccount, type Role } from '@/access/roles'
```

with:

```ts
import {
  anyone,
  isOwner,
  isStaff,
  nobody,
  ownerOnly,
  ownerOnlyField,
  ownerOrOwnAccount,
  publishedOrStaff,
  staffOnly,
  staffOnlyField,
  type Role,
} from '@/access/roles'
```

and append at the end of the file:

```ts
describe('isStaff, staffOnly and staffOnlyField', () => {
  it('allow the owner and the assistant, and deny everyone else', () => {
    for (const check of [
      (user: unknown) => isStaff(user as never),
      (user: unknown) => staffOnly(reqWith(user)),
      (user: unknown) => staffOnlyField(reqWith(user)),
    ]) {
      expect(check(owner)).toBe(true)
      expect(check(assistant)).toBe(true)
      expect(check(null)).toBe(false)
    }
  })

  it.each(untrusted)('deny %s', (_label, user) => {
    expect(isStaff(user as never)).toBe(false)
    expect(staffOnly(reqWith(user))).toBe(false)
    expect(staffOnlyField(reqWith(user))).toBe(false)
  })
})

describe('nobody', () => {
  it('denies everyone, the owner included', () => {
    expect(nobody(reqWith(owner))).toBe(false)
    expect(nobody(reqWith(assistant))).toBe(false)
    expect(nobody(reqWith(null))).toBe(false)
  })
})

describe('anyone', () => {
  it('allows everyone, signed in or not', () => {
    expect(anyone(reqWith(null))).toBe(true)
    expect(anyone(reqWith(owner))).toBe(true)
  })
})

describe('publishedOrStaff', () => {
  const PUBLISHED_ONLY = { _status: { equals: 'published' } }

  it('gives staff every document', () => {
    expect(publishedOrStaff(reqWith(owner))).toBe(true)
    expect(publishedOrStaff(reqWith(assistant))).toBe(true)
  })

  it('limits everyone else to published documents', () => {
    expect(publishedOrStaff(reqWith(null))).toEqual(PUBLISHED_ONLY)
  })

  it.each(untrusted)('limits %s to published documents', (_label, user) => {
    expect(publishedOrStaff(reqWith(user))).toEqual(PUBLISHED_ONLY)
  })
})
```

- [ ] **Step 2: Run them and see them fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/roles.unit.spec.ts
```

Expected: FAIL, because `isStaff`, `staffOnly`, `nobody`, `anyone` and `publishedOrStaff` aren't exported.

- [ ] **Step 3: Add the helpers.** In `src/access/roles.ts`, replace:

```ts
export const isOwner = (user: RequestUser): boolean => isStaffUser(user) && user.role === 'owner'

export const ownerOnly: Access = ({ req }) => isOwner(req.user)

export const ownerOnlyField: FieldAccess = ({ req }) => isOwner(req.user)
```

with:

```ts
export const isOwner = (user: RequestUser): boolean => isStaffUser(user) && user.role === 'owner'

/** The owner or the assistant. */
export const isStaff = (user: RequestUser): boolean => isStaffUser(user)

export const ownerOnly: Access = ({ req }) => isOwner(req.user)

export const ownerOnlyField: FieldAccess = ({ req }) => isOwner(req.user)

export const staffOnly: Access = ({ req }) => isStaff(req.user)

export const staffOnlyField: FieldAccess = ({ req }) => isStaff(req.user)

/** For fields only the server sets, in hooks: no API request may write them, the owner's included. */
export const nobody: FieldAccess = () => false

export const anyone: Access = () => true

/**
 * Collections with drafts: staff see every document, everyone else only published ones.
 * Never reuse on a collection without drafts: it filters on `_status`.
 */
export const publishedOrStaff: Access = ({ req }) =>
  isStaff(req.user) ? true : { _status: { equals: 'published' } }
```

- [ ] **Step 4: Run the tests and see them pass**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/roles.unit.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run lint && npm run typecheck
git add src/access/roles.ts tests/unit/roles.unit.spec.ts
git commit -m "feat: staff, server-only and published-or-staff access helpers"
```

### Task 3: Slugs

**Files:**
- Create: `src/lib/slug.ts`
- Test: `tests/unit/slug.unit.spec.ts`

- [ ] **Step 1: Write the failing tests** in `tests/unit/slug.unit.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { foldDiacritics, slugify } from '@/lib/slug'

describe('foldDiacritics', () => {
  it('removes diacritics and keeps case', () => {
    expect(foldDiacritics('Māyā')).toBe('Maya')
    expect(foldDiacritics('Śiva and Ṛta')).toBe('Siva and Rta')
  })

  it('leaves Devanagari, including its vowel signs and virama, untouched', () => {
    expect(foldDiacritics('धर्म कर्म')).toBe('धर्म कर्म')
  })

  it('folds every IAST letter, small and capital', () => {
    expect(foldDiacritics('ā ī ū ṛ ṝ ḷ ḹ ṃ ḥ ṅ ñ ṭ ḍ ṇ ś ṣ')).toBe('a i u r r l l m h n n t d n s s')
    expect(foldDiacritics('Ā Ī Ū Ṛ Ṝ Ḷ Ḹ Ṃ Ḥ Ṅ Ñ Ṭ Ḍ Ṇ Ś Ṣ')).toBe('A I U R R L L M H N N T D N S S')
  })
})

describe('slugify', () => {
  it('makes plain ASCII words joined by hyphens', () => {
    expect(slugify('Māyā and the Rope')).toBe('maya-and-the-rope')
    expect(slugify('Sādhanā')).toBe('sadhana')
    expect(slugify('Adhyātma')).toBe('adhyatma')
    expect(slugify('jñāna')).toBe('jnana')
  })

  it('collapses punctuation and spaces, and trims hyphens', () => {
    expect(slugify('  --Who am I?  ')).toBe('who-am-i')
    expect(slugify('Text / Story Study')).toBe('text-story-study')
  })

  it('keeps digits', () => {
    expect(slugify('Gītā 2.47')).toBe('gita-2-47')
  })

  it('drops letters that have no ASCII form', () => {
    expect(slugify('karma कर्म')).toBe('karma')
    expect(slugify('कर्म')).toBe('')
  })

  it('returns an empty string for nothing usable', () => {
    expect(slugify('')).toBe('')
    expect(slugify('!!!')).toBe('')
  })
})
```

- [ ] **Step 2: Run and see it fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/slug.unit.spec.ts
```

Expected: FAIL, `Cannot find module '@/lib/slug'` or equivalent.

- [ ] **Step 3: Implement** `src/lib/slug.ts`:

```ts
/**
 * Removes Latin diacritics: NFD splits each letter from its marks, and the combining diacritical
 * marks (U+0300 to U+036F, which cover every IAST mark) are dropped (`ā` → `a`). Other scripts are
 * left as they are: Devanagari vowel signs and the virama are marks too, and are not diacritics.
 */
export function foldDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]+/g, '')
    .normalize('NFC')
}

/**
 * A plain-ASCII URL slug: lowercase letters and digits joined by single hyphens. URLs stay ASCII
 * while titles keep their diacritics (website design, 7.2). Letters with no ASCII form, such as
 * Devanagari, are dropped, so a title written only in them gives an empty slug.
 */
export function slugify(text: string): string {
  return foldDiacritics(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 4: Run and see it pass**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/slug.unit.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run lint && npm run typecheck
git add src/lib/slug.ts tests/unit/slug.unit.spec.ts
git commit -m "feat: ASCII slugs with IAST diacritics folded"
```

### Task 4: Reading the editor's content

**Files:**
- Create: `src/lib/rich-text.ts`
- Test: `tests/unit/rich-text.unit.spec.ts`

- [ ] **Step 1: Write the failing tests** in `tests/unit/rich-text.unit.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { countWords, extractText, findUploadIds } from '@/lib/rich-text'

const text = (value: string) => ({ type: 'text', text: value })
const paragraph = (...children: unknown[]) => ({ type: 'paragraph', children })
const root = (...children: unknown[]) => ({ root: { type: 'root', children } })

describe('extractText', () => {
  it('joins paragraphs with line breaks and inline text without', () => {
    const value = root(
      paragraph(text('Māyā is '), { type: 'link', children: [text('not')] }, text(' illusion.')),
      paragraph(text('Second.')),
    )
    expect(extractText(value)).toBe('Māyā is not illusion.\nSecond.')
  })

  it('reads every text field of a block, and skips its id, name and type', () => {
    const value = root({
      type: 'block',
      fields: {
        id: '65f1c0ffee0000000000abcd',
        blockName: 'my verse',
        blockType: 'verse',
        transliteration: 'karmaṇy evādhikāras te',
        translation: 'Your right is to action alone.',
        location: '2.47',
      },
    })
    expect(extractText(value)).toBe(
      'karmaṇy evādhikāras te\nYour right is to action alone.\n2.47',
    )
  })

  it('separates list items', () => {
    const value = root({
      type: 'list',
      children: [
        { type: 'listitem', children: [text('one')] },
        { type: 'listitem', children: [text('two')] },
      ],
    })
    expect(extractText(value)).toBe('one\ntwo')
  })

  it('turns line breaks and tabs into whitespace', () => {
    const value = root(paragraph(text('a'), { type: 'linebreak' }, text('b'), { type: 'tab' }, text('c')))
    expect(extractText(value)).toBe('a\nb c')
  })

  it('returns an empty string for anything that is not editor content', () => {
    expect(extractText(undefined)).toBe('')
    expect(extractText(null)).toBe('')
    expect(extractText('text')).toBe('')
    expect(extractText({ root: null })).toBe('')
  })
})

describe('countWords', () => {
  it('counts words in Latin script, IAST and Devanagari', () => {
    expect(countWords('Māyā is not illusion.')).toBe(4)
    expect(countWords('कर्मण्येवाधिकारस्ते मा फलेषु')).toBe(3)
    expect(countWords("the seeker's path — at dawn")).toBe(5)
    // A verse location splits at its dot: "2" and "47".
    expect(countWords('2.47')).toBe(2)
  })

  it('is zero for empty or punctuation-only text', () => {
    expect(countWords('')).toBe(0)
    expect(countWords(' — … ')).toBe(0)
  })
})

describe('findUploadIds', () => {
  it('finds media images anywhere in the content, by id or populated document', () => {
    const value = root(
      { type: 'upload', relationTo: 'media', value: 7 },
      paragraph(text('between')),
      { type: 'list', children: [{ type: 'upload', relationTo: 'media', value: { id: 9, alt: 'x' } }] },
    )
    expect(findUploadIds(value)).toEqual([7, 9])
  })

  it('ignores other collections and removed images', () => {
    const value = root(
      { type: 'upload', relationTo: 'documents', value: 3 },
      { type: 'upload', relationTo: 'media', value: null },
    )
    expect(findUploadIds(value)).toEqual([])
  })

  it('lists an image used twice once', () => {
    const value = root(
      { type: 'upload', relationTo: 'media', value: 3 },
      { type: 'upload', relationTo: 'media', value: { id: 3 } },
      { type: 'upload', relationTo: 'media', value: 4 },
    )
    expect(findUploadIds(value)).toEqual([3, 4])
  })
})
```

- [ ] **Step 2: Run and see it fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/rich-text.unit.spec.ts
```

Expected: FAIL, the module doesn't exist.

- [ ] **Step 3: Implement** `src/lib/rich-text.ts`:

```ts
/**
 * Reads Payload's serialized Lexical content without the editor. Only the parts this module needs
 * are typed; everything is checked at runtime, so malformed content gives empty results.
 */
interface LexicalNode {
  type?: unknown
  text?: unknown
  children?: unknown
  fields?: unknown
  relationTo?: unknown
  value?: unknown
}

// Nodes that sit inside a line of text. Everything else is a block and starts a new line.
const INLINE_TYPES = new Set(['text', 'link', 'autolink', 'linebreak', 'tab'])
// Block fields that are Payload's bookkeeping, not content.
const BLOCK_META_FIELDS = new Set(['id', 'blockName', 'blockType'])

const isNode = (value: unknown): value is LexicalNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const childrenOf = (node: LexicalNode): LexicalNode[] =>
  Array.isArray(node.children) ? node.children.filter(isNode) : []

function textOf(node: LexicalNode): string {
  if (node.type === 'text') return typeof node.text === 'string' ? node.text : ''
  if (node.type === 'linebreak') return '\n'
  if (node.type === 'tab') return ' '
  if (node.type === 'block' && isNode(node.fields)) {
    return Object.entries(node.fields)
      .filter(([key, value]) => !BLOCK_META_FIELDS.has(key) && typeof value === 'string')
      .map(([, value]) => value as string)
      .join('\n')
  }
  const children = childrenOf(node)
  const inline = children.every((child) => INLINE_TYPES.has(String(child.type)))
  return children.map(textOf).join(inline ? '' : '\n')
}

const rootOf = (value: unknown): LexicalNode | undefined =>
  isNode(value) && isNode((value as { root?: unknown }).root)
    ? ((value as { root: LexicalNode }).root)
    : undefined

/** The plain text of editor content, block fields included: one line per paragraph or block. */
export function extractText(value: unknown): string {
  const root = rootOf(value)
  if (!root) return ''
  return textOf(root).replace(/\n{2,}/g, '\n').trim()
}

/** Words in any script: a letter or digit, then letters, combining marks, digits or apostrophes. */
export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}][\p{L}\p{M}\p{N}'’]*/gu)?.length ?? 0
}

const idOf = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (isNode(value)) {
    const id = (value as { id?: unknown }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

/** The ids of images from a collection (`media` by default) anywhere in editor content, each once. */
export function findUploadIds(value: unknown, relationTo = 'media'): (number | string)[] {
  const ids: (number | string)[] = []
  const seen = new Set<string>()
  const visit = (node: LexicalNode): void => {
    if (node.type === 'upload' && node.relationTo === relationTo) {
      const id = idOf(node.value)
      if (id !== null && !seen.has(String(id))) {
        seen.add(String(id))
        ids.push(id)
      }
    }
    childrenOf(node).forEach(visit)
  }
  const root = rootOf(value)
  if (root) visit(root)
  return ids
}
```

- [ ] **Step 4: Run and see it pass**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/rich-text.unit.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run lint && npm run typecheck
git add src/lib/rich-text.ts tests/unit/rich-text.unit.spec.ts
git commit -m "feat: plain text, word counts and image ids from editor content"
```

### Task 5: Reading time and search text

**Files:**
- Create: `src/lib/article-text.ts`
- Test: `tests/unit/article-text.unit.spec.ts`

- [ ] **Step 1: Write the failing tests** in `tests/unit/article-text.unit.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { readingTime, searchTextFrom, WORDS_PER_MINUTE } from '@/lib/article-text'

describe('readingTime', () => {
  it('is at least one minute', () => {
    expect(readingTime(0)).toBe(1)
    expect(readingTime(1)).toBe(1)
  })

  it('rounds up at 200 words a minute', () => {
    expect(WORDS_PER_MINUTE).toBe(200)
    expect(readingTime(200)).toBe(1)
    expect(readingTime(201)).toBe(2)
    expect(readingTime(1000)).toBe(5)
  })
})

describe('searchTextFrom', () => {
  it('lowercases, folds diacritics and collapses whitespace, so "maya" finds "Māyā"', () => {
    expect(searchTextFrom(['Māyā and the Rope', 'One  line.\nSecond'])).toBe(
      'maya and the rope one line. second',
    )
  })

  it('skips missing parts', () => {
    expect(searchTextFrom([null, 'Sādhanā', undefined, ''])).toBe('sadhana')
  })

  it('keeps Devanagari words whole', () => {
    expect(searchTextFrom(['कि', 'की'])).toBe('कि की')
  })
})
```

- [ ] **Step 2: Run and see it fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/article-text.unit.spec.ts
```

Expected: FAIL, the module doesn't exist.

- [ ] **Step 3: Implement** `src/lib/article-text.ts`:

```ts
import { foldDiacritics } from './slug'

export const WORDS_PER_MINUTE = 200

/** Minutes to read, rounded up, never less than one. */
export function readingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))
}

/**
 * The text search matches against: lowercase, diacritics removed, whitespace collapsed. A search
 * folds the reader's query the same way, so "maya" finds "māyā" (website design, 13).
 */
export function searchTextFrom(parts: readonly (string | null | undefined)[]): string {
  return foldDiacritics(parts.filter((part): part is string => Boolean(part)).join(' '))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
```

- [ ] **Step 4: Run and see it pass**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/article-text.unit.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run lint && npm run typecheck
git add src/lib/article-text.ts tests/unit/article-text.unit.spec.ts
git commit -m "feat: reading time and accent-insensitive search text"
```

### Task 6: The publish rules

**Files:**
- Create: `src/lib/publish-rules.ts`
- Test: `tests/unit/publish-rules.unit.spec.ts`

- [ ] **Step 1: Write the failing tests** in `tests/unit/publish-rules.unit.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  PUBLISH_MESSAGES,
  publishProblems,
  TEXT_STORY_STUDY,
  type PublishCheckInput,
} from '@/lib/publish-rules'

const ready: PublishCheckInput = {
  shape: 'inquiry-essay',
  difficulty: { needsPriorReading: false },
  readFirst: [],
  sourceCount: 0,
  images: [{ id: 1, alt: 'A lamp' }],
}

describe('publishProblems', () => {
  it('finds nothing wrong with a ready article', () => {
    expect(publishProblems(ready)).toEqual([])
  })

  it('needs a difficulty level', () => {
    expect(publishProblems({ ...ready, difficulty: null })).toEqual([
      { path: 'difficulty', message: PUBLISH_MESSAGES.difficulty },
    ])
  })

  it('needs a prior reading when the level asks for one', () => {
    const advanced = { ...ready, difficulty: { needsPriorReading: true } }
    expect(publishProblems(advanced)).toEqual([
      { path: 'readFirst', message: PUBLISH_MESSAGES.readFirst },
    ])
    expect(
      publishProblems({ ...advanced, readFirst: [{ kind: 'external', title: 'Gītā, chapter 2' }] }),
    ).toEqual([])
  })

  it('needs each prior reading to name an article, or a title for one elsewhere', () => {
    const problems = publishProblems({
      ...ready,
      readFirst: [
        { kind: 'internal', article: null },
        { kind: 'external', title: '  ' },
        { kind: 'internal', article: 4 },
        { kind: 'external', title: 'Upaniṣads' },
      ],
    })
    expect(problems).toEqual([
      { path: 'readFirst.0.article', message: PUBLISH_MESSAGES.readFirstItem },
      { path: 'readFirst.1.title', message: PUBLISH_MESSAGES.readFirstItem },
    ])
  })

  it('needs a source for a Text / Story Study', () => {
    expect(publishProblems({ ...ready, shape: TEXT_STORY_STUDY })).toEqual([
      { path: 'sources', message: PUBLISH_MESSAGES.sources },
    ])
    expect(publishProblems({ ...ready, shape: TEXT_STORY_STUDY, sourceCount: 1 })).toEqual([])
  })

  it('needs alt text on every image in the body', () => {
    const problems = publishProblems({
      ...ready,
      images: [
        { id: 1, alt: 'A lamp' },
        { id: 2, alt: '   ' },
        { id: 3, alt: undefined },
      ],
    })
    expect(problems).toEqual([
      { path: 'body', message: PUBLISH_MESSAGES.imageAlt(2) },
      { path: 'body', message: PUBLISH_MESSAGES.imageAlt(3) },
    ])
  })

  it('lists every problem at once', () => {
    const problems = publishProblems({
      shape: TEXT_STORY_STUDY,
      difficulty: { needsPriorReading: true },
      readFirst: [],
      sourceCount: 0,
      images: [{ id: 5, alt: '' }],
    })
    expect(problems.map((problem) => problem.path)).toEqual(['readFirst', 'sources', 'body'])
  })
})
```

- [ ] **Step 2: Run and see it fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/publish-rules.unit.spec.ts
```

Expected: FAIL, the module doesn't exist.

- [ ] **Step 3: Implement** `src/lib/publish-rules.ts`:

```ts
/** The value of the Text / Story Study shape, the only shape that must cite a source. */
export const TEXT_STORY_STUDY = 'text-story-study'

export const PUBLISH_MESSAGES = {
  difficulty: 'Choose a difficulty level before publishing.',
  readFirst: 'This difficulty level needs at least one suggested prior reading.',
  readFirstItem: 'Each prior reading needs a SageVani article, or a title for one elsewhere.',
  sources: 'A Text / Story Study needs at least one source.',
  imageAlt: (id: number | string): string => `Image ${id} in the body has no alt text.`,
} as const

export interface PriorReading {
  kind?: string | null
  article?: unknown
  title?: string | null
}

export interface PublishCheckInput {
  shape: string | null | undefined
  /** The chosen level, or null when none is chosen (or it no longer exists). */
  difficulty: { needsPriorReading: boolean } | null
  readFirst: readonly PriorReading[]
  sourceCount: number
  images: readonly { id: number | string; alt: string | null | undefined }[]
}

export interface PublishProblem {
  /** The field the problem belongs to, as Payload's ValidationError expects. */
  path: string
  message: string
}

const isBlank = (value: string | null | undefined): boolean => !value || value.trim() === ''

/**
 * The publish rules (website design 5.1, stage 2 design 4.3). Run only when an article is being
 * published; drafts may be incomplete. Returns every problem, so one error can list them all.
 */
export function publishProblems(input: PublishCheckInput): PublishProblem[] {
  const problems: PublishProblem[] = []

  if (!input.difficulty) {
    problems.push({ path: 'difficulty', message: PUBLISH_MESSAGES.difficulty })
  } else if (input.difficulty.needsPriorReading && input.readFirst.length === 0) {
    problems.push({ path: 'readFirst', message: PUBLISH_MESSAGES.readFirst })
  }

  input.readFirst.forEach((item, index) => {
    if (item.kind === 'internal') {
      if (item.article === null || item.article === undefined) {
        problems.push({ path: `readFirst.${index}.article`, message: PUBLISH_MESSAGES.readFirstItem })
      }
    } else if (isBlank(item.title)) {
      problems.push({ path: `readFirst.${index}.title`, message: PUBLISH_MESSAGES.readFirstItem })
    }
  })

  if (input.shape === TEXT_STORY_STUDY && input.sourceCount === 0) {
    problems.push({ path: 'sources', message: PUBLISH_MESSAGES.sources })
  }

  for (const image of input.images) {
    if (isBlank(image.alt)) problems.push({ path: 'body', message: PUBLISH_MESSAGES.imageAlt(image.id) })
  }

  return problems
}
```

- [ ] **Step 4: Run and see it pass**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/publish-rules.unit.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run lint && npm run typecheck
git add src/lib/publish-rules.ts tests/unit/publish-rules.unit.spec.ts
git commit -m "feat: the publish rules as a pure function"
```

### Task 7: The editorial checklist field

**Files:**
- Create: `src/collections/articles/editorial-checklist.ts`
- Test: `tests/unit/editorial-checklist.unit.spec.ts`

The checklist mirrors `templates/editorial-review.md`. The test reads the template, so the two can't drift apart.

- [ ] **Step 1: Write the failing test** in `tests/unit/editorial-checklist.unit.spec.ts`:

```ts
import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import {
  editorialChecklist,
  INTEGRITY_CHECKS,
  VOICE_CHECKS,
} from '@/collections/articles/editorial-checklist'

// The repository's template, from website/: ../templates/editorial-review.md
const TEMPLATE = readFileSync(path.resolve(process.cwd(), '../templates/editorial-review.md'), 'utf8')

/** The "- [ ] " items under a "## heading", backticks removed, in order. */
const itemsUnder = (heading: string): string[] => {
  const section = TEMPLATE.split(/^## /m).find((part) => part.startsWith(`${heading}\n`)) ?? ''
  return [...section.matchAll(/^- \[ \] (.+)$/gm)].map((match) => match[1].replaceAll('`', ''))
}

describe('editorial checklist', () => {
  it('mirrors the Integrity items of templates/editorial-review.md, in order', () => {
    expect(INTEGRITY_CHECKS.map(([, label]) => label)).toEqual(itemsUnder('Integrity'))
  })

  it('mirrors the Voice and readiness items, in order', () => {
    expect(VOICE_CHECKS.map(([, label]) => label)).toEqual(itemsUnder('Voice and readiness'))
  })

  it('has 17 checkboxes and three notes fields', () => {
    expect(INTEGRITY_CHECKS).toHaveLength(9)
    expect(VOICE_CHECKS).toHaveLength(8)
    expect(editorialChecklist.type).toBe('group')
  })

  it('lets only the owner tick it, and only staff read it', () => {
    expect(editorialChecklist.access?.read).toBeDefined()
    expect(editorialChecklist.access?.create).toBeDefined()
    expect(editorialChecklist.access?.update).toBeDefined()
  })
})
```

- [ ] **Step 2: Run and see it fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/editorial-checklist.unit.spec.ts
```

Expected: FAIL, the module doesn't exist.

- [ ] **Step 3: Implement** `src/collections/articles/editorial-checklist.ts`:

```ts
import type { CheckboxField, GroupField } from 'payload'

import { ownerOnlyField, staffOnlyField } from '../../access/roles'

/**
 * The items of templates/editorial-review.md, in its order, without its backticks. A unit test
 * compares them with the template, so change both together.
 */
export const INTEGRITY_CHECKS = [
  ['quotesLocated', 'Quotes are located and attributed.'],
  ['claimsEvidenced', 'Factual and scriptural claims have sufficient evidence.'],
  ['contextChecked', 'Context and relevant translation differences are checked.'],
  ['schoolDistinguished', 'Named school or tradition is distinguished from universal claims.'],
  ['symbolismLabelled', 'Personal symbolism is labeled.'],
  ['sanskritChecked', 'Sanskrit is checked when the argument depends on it.'],
  ['layersDistinct', 'Text, tradition, reflection, and practice remain distinguishable.'],
  ['sufferingRespected', 'Spiritual language does not minimize suffering or avoid responsibility.'],
  ['noOpenProblem', 'No known unresolved factual problem materially affects the piece.'],
] as const

export const VOICE_CHECKS = [
  ['questionAlive', 'The question is alive and the inward turn comes from the author.'],
  ['readAloud', 'Read aloud for clarity, false certainty, preaching, and manufactured profundity.'],
  ['quietTest', 'Quiet test completed where possible.'],
  ['authorStands', 'The author would stand behind it without praise or engagement.'],
  ['difficultyIncluded', 'A difficulty level is included using owner-approved labels.'],
  [
    'priorReadingIncluded',
    'Advanced topics include relevant suggested prior readings and explain expected background.',
  ],
  ['bylineSagevani', 'The public byline is Sagevani.'],
  ['draftsExcluded', 'Drafts and review records are excluded from website output.'],
] as const

const checkbox = ([name, label]: readonly [string, string]): CheckboxField => ({
  name,
  label,
  type: 'checkbox',
})

/**
 * Admin-only and never public. It never blocks publishing, and ticking it is not approval:
 * publishing is (website design 8.3). Only the owner can tick it, so a tick never claims a check
 * the assistant may not have done.
 */
export const editorialChecklist: GroupField = {
  name: 'editorialChecklist',
  type: 'group',
  admin: {
    description:
      'Never public, and never blocks publishing. Ticking these is not approval: publishing is.',
  },
  access: { read: staffOnlyField, create: ownerOnlyField, update: ownerOnlyField },
  fields: [
    { name: 'integrity', type: 'group', fields: INTEGRITY_CHECKS.map(checkbox) },
    {
      name: 'voice',
      label: 'Voice and readiness',
      type: 'group',
      fields: VOICE_CHECKS.map(checkbox),
    },
    { name: 'unresolvedIssues', type: 'textarea' },
    { name: 'requiredChanges', type: 'textarea' },
    { name: 'sourceRecords', type: 'textarea' },
  ],
}
```

- [ ] **Step 4: Run and see it pass**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/editorial-checklist.unit.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run lint && npm run typecheck
git add src/collections/articles/editorial-checklist.ts tests/unit/editorial-checklist.unit.spec.ts
git commit -m "feat: the editorial checklist field, kept in step with its template"
```

### Task 8: Media storage variables

**Files:**
- Modify: `src/lib/env.ts`
- Test: `tests/unit/env.unit.spec.ts`

- [ ] **Step 1: Write the failing tests.** In `tests/unit/env.unit.spec.ts`, directly after the `CA` constant, add:

```ts
const MEDIA = {
  MEDIA_S3_ENDPOINT: 'https://abcd.storage.supabase.co/storage/v1/s3',
  MEDIA_S3_REGION: 'us-east-2',
  MEDIA_S3_ACCESS_KEY_ID: 'access-key-id',
  MEDIA_S3_SECRET_ACCESS_KEY: 'secret-access-key',
  MEDIA_S3_BUCKET: 'media',
  MEDIA_PUBLIC_URL: 'https://abcd.supabase.co/storage/v1/object/public/media',
}

const REMOTE = {
  DATABASE_URL: 'postgres://u:p@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
  DATABASE_CA_CERT: CA,
}
```

Three existing tests use a remote database and expect success. A remote database now needs the media variables too, so add them:

- In `accepts the postgresql:// scheme`, replace `DATABASE_CA_CERT: CA,` with `DATABASE_CA_CERT: CA,\n      ...MEDIA,`.
- In `accepts a remote database with a CA certificate and keeps the certificate`, replace ``DATABASE_CA_CERT: `  ${CA}\n`,`` with ``DATABASE_CA_CERT: `  ${CA}\n`,\n      ...MEDIA,``.
- In `converts a single-line certificate with literal backslash-n escapes to multi-line form`, replace `DATABASE_CA_CERT: escaped,` with `DATABASE_CA_CERT: escaped,\n      ...MEDIA,`.

Then append at the end of the file:

```ts
describe('media storage variables', () => {
  it('needs none of them for a local database', () => {
    expect(parseServerEnv(VALID).MEDIA_S3_BUCKET).toBeUndefined()
  })

  it('requires all of them for a database that is not local', () => {
    expect(() => parseServerEnv({ ...VALID, ...REMOTE })).toThrowError(
      /MEDIA_S3_ENDPOINT: is required for a database that is not local[\s\S]*MEDIA_PUBLIC_URL: is required for a database that is not local/,
    )
  })

  it('accepts a remote database with all of them', () => {
    const env = parseServerEnv({ ...VALID, ...REMOTE, ...MEDIA })
    expect(env.MEDIA_S3_BUCKET).toBe('media')
    expect(env.MEDIA_PUBLIC_URL).toBe(MEDIA.MEDIA_PUBLIC_URL)
  })

  it('refuses some without the others, even for a local database', () => {
    expect(() => parseServerEnv({ ...VALID, MEDIA_S3_BUCKET: 'media' })).toThrowError(
      /MEDIA_S3_ENDPOINT: must be set with the other media storage variables/,
    )
  })

  it('treats empty values as absent', () => {
    const blanks = Object.fromEntries(Object.keys(MEDIA).map((name) => [name, '  ']))
    expect(() => parseServerEnv({ ...VALID, ...blanks })).not.toThrow()
  })

  it('requires https:// URLs for the endpoint and the public URL', () => {
    expect(() =>
      parseServerEnv({ ...VALID, ...MEDIA, MEDIA_S3_ENDPOINT: 'http://abcd.supabase.co/s3' }),
    ).toThrowError(/MEDIA_S3_ENDPOINT: must be an https:\/\/ URL/)
    expect(() =>
      parseServerEnv({ ...VALID, ...MEDIA, MEDIA_PUBLIC_URL: 'abcd.supabase.co/media' }),
    ).toThrowError(/MEDIA_PUBLIC_URL: must be an https:\/\/ URL/)
  })

  it('refuses a query string or fragment on the public URL, because file names are appended', () => {
    for (const suffix of ['?x=1', '#top']) {
      expect(() =>
        parseServerEnv({
          ...VALID,
          ...MEDIA,
          MEDIA_PUBLIC_URL: `${MEDIA.MEDIA_PUBLIC_URL}${suffix}`,
        }),
      ).toThrowError(/MEDIA_PUBLIC_URL: must be an https:\/\/ URL with no \? or #/)
    }
  })

  it('drops trailing slashes from the public URL', () => {
    const env = parseServerEnv({
      ...VALID,
      ...MEDIA,
      MEDIA_PUBLIC_URL: `${MEDIA.MEDIA_PUBLIC_URL}//`,
    })
    expect(env.MEDIA_PUBLIC_URL).toBe(MEDIA.MEDIA_PUBLIC_URL)
  })

  it('never echoes the secret access key', () => {
    expect(() =>
      parseServerEnv({
        ...VALID,
        ...MEDIA,
        MEDIA_S3_ENDPOINT: 'not-a-url',
        MEDIA_S3_SECRET_ACCESS_KEY: 'hunter2-storage-secret',
      }),
    ).toThrowError(
      expect.objectContaining({ message: expect.not.stringMatching(/hunter2-storage-secret/) }),
    )
  })
})
```

- [ ] **Step 2: Run and see the new tests fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/env.unit.spec.ts
```

Expected: FAIL in `media storage variables`. The variables aren't known yet, so a remote database parses without them.

- [ ] **Step 3: Implement.** In `src/lib/env.ts`, add after the `normaliseCaCert` function:

```ts
/** Media storage variables: all set, or none set (Supabase Storage, stage 2 design 5). */
export const MEDIA_STORAGE_VARIABLES = [
  'MEDIA_S3_ENDPOINT',
  'MEDIA_S3_REGION',
  'MEDIA_S3_ACCESS_KEY_ID',
  'MEDIA_S3_SECRET_ACCESS_KEY',
  'MEDIA_S3_BUCKET',
  'MEDIA_PUBLIC_URL',
] as const

// An empty or whitespace-only value counts as absent, as in .env.example.
const optionalText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() || undefined : value

const withoutTrailingSlashes = (value: unknown): unknown => {
  const text = optionalText(value)
  return typeof text === 'string' ? text.replace(/\/+$/, '') : text
}

const HTTPS_URL = z.string().regex(/^https:\/\/[^\s/]+(\/\S*)?$/, 'must be an https:// URL')

// File names are appended to the public URL, so it can't carry a query string or fragment.
const PUBLIC_URL = z
  .string()
  .regex(/^https:\/\/[^\s/?#]+(\/[^\s?#]*)?$/, 'must be an https:// URL with no ? or #')
```

In `serverEnvSchema`'s object, after the whole `DATABASE_CA_CERT` entry (it spans four lines and ends with `    ),`), add:

```ts
    MEDIA_S3_ENDPOINT: z.preprocess(optionalText, HTTPS_URL.optional()),
    MEDIA_S3_REGION: z.preprocess(optionalText, z.string().optional()),
    MEDIA_S3_ACCESS_KEY_ID: z.preprocess(optionalText, z.string().optional()),
    MEDIA_S3_SECRET_ACCESS_KEY: z.preprocess(optionalText, z.string().optional()),
    MEDIA_S3_BUCKET: z.preprocess(optionalText, z.string().optional()),
    MEDIA_PUBLIC_URL: z.preprocess(withoutTrailingSlashes, PUBLIC_URL.optional()),
```

In `superRefine`, after the `if (!isLocalDatabase(env.DATABASE_URL) && !env.DATABASE_CA_CERT) { … }` block, add:

```ts
    // Netlify functions have no lasting disk, so a deployed site must store media in Supabase.
    const present = MEDIA_STORAGE_VARIABLES.filter((name) => env[name] !== undefined)
    if (present.length > 0 || !isLocalDatabase(env.DATABASE_URL)) {
      for (const name of MEDIA_STORAGE_VARIABLES) {
        if (env[name] !== undefined) continue
        ctx.addIssue({
          code: 'custom',
          path: [name],
          message:
            present.length > 0
              ? 'must be set with the other media storage variables'
              : 'is required for a database that is not local',
        })
      }
    }
```

- [ ] **Step 4: Run and see them pass**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/env.unit.spec.ts
```

Expected: PASS, every test in the file.

- [ ] **Step 5: Commit**

```bash
npm run lint && npm run typecheck
git add src/lib/env.ts tests/unit/env.unit.spec.ts
git commit -m "feat: media storage variables, required wherever the database isn't local"
```

### Task 9: Test helpers

**Files:**
- Create: `tests/helpers/content.ts`

No test of its own: every integration test from Task 10 on uses it. It names collections that don't exist until Tasks 11, 12 and 15. Collection names are cast to `CollectionSlug`, so it type-checks from the start and skips collections that aren't registered yet. Task 10 commits it.

- [ ] **Step 1: Create** `tests/helpers/content.ts`:

```ts
import { handleEndpoints, ValidationError, type CollectionSlug, type Payload } from 'payload'

import { allowOwnerChange } from '@/collections/Users'
import config from '@/payload.config'
import type { User } from '@/payload-types'

export const PASSWORD = 'correct-horse-battery-staple'
export const ASSISTANT_KEY = 'test-assistant-key-0123456789abcdef'

/**
 * Calls the real REST API, the way the assistant's drafting tool and browsers do: anonymously,
 * or with the assistant's API key. Payload's handler runs in-process; no server is needed.
 */
export function rest(
  method: 'DELETE' | 'GET' | 'PATCH' | 'POST',
  route: string,
  { key, body }: { key?: string; body?: unknown } = {},
): Promise<Response> {
  return handleEndpoints({
    config,
    request: new Request(`http://localhost:3000/api/${route}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { Authorization: `users API-Key ${key}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  })
}

// Referencing collections first, so a document goes before anything it points at.
const CONTENT_COLLECTIONS = ['articles', 'pages', 'media', 'topics', 'difficultyLevels']

/** Deletes every content document and every account. Integration tests only. */
export async function clearContent(payload: Payload): Promise<void> {
  for (const name of CONTENT_COLLECTIONS) {
    const collection = name as CollectionSlug
    // Collections arrive task by task; skip one that isn't registered yet.
    if (!payload.collections[collection]) continue
    await payload.delete({ collection, where: { id: { exists: true } }, overrideAccess: true })
  }
  await payload.delete({
    collection: 'users',
    where: { id: { exists: true } },
    overrideAccess: true,
    context: allowOwnerChange(),
  })
}

/** The owner, and an assistant holding ASSISTANT_KEY. */
export async function createStaff(payload: Payload): Promise<{ owner: User; assistant: User }> {
  const owner = await payload.create({
    collection: 'users',
    data: { email: 'owner@example.com', name: 'Owner', password: PASSWORD, role: 'owner' },
    overrideAccess: true,
  })
  const assistant = await payload.create({
    collection: 'users',
    data: {
      email: 'assistant@example.com',
      name: 'Assistant',
      password: PASSWORD,
      role: 'assistant',
      enableAPIKey: true,
      apiKey: ASSISTANT_KEY,
    },
    overrideAccess: true,
  })
  return { owner, assistant }
}

/**
 * The field messages of the ValidationError an attempt rejects with. Payload's own message is
 * generic ("The following field is invalid: slug"); the rule's wording is in `data.errors`.
 */
export async function validationMessages(attempt: Promise<unknown>): Promise<string[]> {
  const error = await attempt.then(
    () => undefined,
    (thrown: unknown) => thrown,
  )
  if (!(error instanceof ValidationError)) {
    throw new Error(`Expected a ValidationError, got ${String(error)}`)
  }
  return error.data.errors.map(({ message }) => message)
}
```

- [ ] **Step 2: No commit yet.** Task 10 commits it with the first tests that use it.

### Task 10: The media collection and its storage

**Files:**
- Create: `src/collections/Media.ts`, `src/lib/media-storage.ts`
- Modify: `src/payload.config.ts`, `src/payload-types.ts` (generated), `src/app/(payload)/admin/importMap.js` (generated)
- Test: `tests/unit/media-storage.unit.spec.ts`, `tests/int/media.int.spec.ts`

- [ ] **Step 1: Write the failing unit test** in `tests/unit/media-storage.unit.spec.ts`:

```ts
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
```

- [ ] **Step 2: Write the failing integration test** in `tests/int/media.int.spec.ts`:

```ts
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
```

- [ ] **Step 3: Run both and see them fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/media-storage.unit.spec.ts tests/int/media.int.spec.ts
```

Expected: FAIL, because `@/lib/media-storage` and `@/collections/Media` don't exist.

- [ ] **Step 4: Create** `src/collections/Media.ts`:

```ts
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

/**
 * The largest upload accepted, in bytes. Netlify functions accept a request body of about 6 MB,
 * and binary bodies arrive base64-encoded (a third larger), so anything over about 4.5 MB would
 * fail on the hosted site before reaching Payload. 4 MB leaves room for the form's other fields.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

/**
 * A file's name is part of its public URL, so a name like "draft-cover-for-maya.jpg" could be
 * guessed and would describe an unpublished draft. Every upload is stored as a random UUID.
 * The extension is the uploaded name's, lowercased, but Payload then re-encodes the image through
 * sharp and swaps in the extension and type it detects from the bytes, so "photo.jpg.html" or a
 * name with no extension is stored as ".jpg" (tests/int/media.int.spec.ts).
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
```

- [ ] **Step 5: Create** `src/lib/media-storage.ts`:

```ts
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
```

- [ ] **Step 6: Register the collection, the upload limit and the adapter.** In `src/payload.config.ts`, replace:

```ts
import { Users } from './collections/Users'
import { databasePoolConfig } from './lib/database-pool'
import { DB_SCHEMA } from './lib/db-schema'
import { parseServerEnv } from './lib/env'
```

with:

```ts
import { s3Storage } from '@payloadcms/storage-s3'

import { MAX_UPLOAD_BYTES, Media } from './collections/Media'
import { Users } from './collections/Users'
import { databasePoolConfig } from './lib/database-pool'
import { DB_SCHEMA } from './lib/db-schema'
import { parseServerEnv } from './lib/env'
import { mediaStoragePlugin, mediaStorageSettings } from './lib/media-storage'
```

Then replace:

```ts
  collections: [Users],
  editor: lexicalEditor(),
```

with:

```ts
  collections: [Users, Media],
  editor: lexicalEditor(),
  upload: { limits: { fileSize: MAX_UPLOAD_BYTES } },
```

Then replace:

```ts
  sharp,
  plugins: [],
```

with:

```ts
  sharp,
  plugins: [s3Storage(mediaStoragePlugin(mediaStorageSettings(env)))],
```

Prettier may move the `@payloadcms/storage-s3` import up with the other packages. Let it.

- [ ] **Step 7: Regenerate types and the import map**

```bash
npm run generate:types && npm run generate:importmap
```

- [ ] **Step 8: Run the tests and see them pass**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/media-storage.unit.spec.ts tests/int/media.int.spec.ts
```

Expected: PASS. Payload logs one `APIError: File size limit has been reached` line for the 413 test; that's expected.

- [ ] **Step 9: Commit**

```bash
npx prettier --write src tests
npm run lint && npm run typecheck
git add src/collections/Media.ts src/lib/media-storage.ts src/payload.config.ts src/payload-types.ts "src/app/(payload)/admin/importMap.js" tests/unit/media-storage.unit.spec.ts tests/int/media.int.spec.ts tests/helpers/content.ts
git commit -m "feat: media with random names, re-encoded uploads and Supabase Storage"
```

### Task 11: Topics, difficulty levels and the slug hooks

**Files:**
- Create: `src/collections/shared/slug.ts`, `src/collections/Topics.ts`, `src/collections/DifficultyLevels.ts`
- Modify: `src/payload.config.ts`, `src/payload-types.ts` (generated)
- Test: `tests/int/topics-and-levels.int.spec.ts`

- [ ] **Step 1: Write the failing test** in `tests/int/topics-and-levels.int.spec.ts`:

```ts
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { SLUG_REQUIRED_MESSAGE } from '@/collections/shared/slug'
import config from '@/payload.config'
import type { User } from '@/payload-types'

import {
  ASSISTANT_KEY,
  clearContent,
  createStaff,
  rest,
  validationMessages,
} from '../helpers/content'

let payload: Payload
let owner: User

const TINT = { background: '#e3cfa8', text: '#3d2f1c' }

const createTopic = (data: { name: string; slug?: string; order?: number }) =>
  payload.create({
    collection: 'topics',
    data: { question: 'How shall I live?', order: 1, coverTint: TINT, ...data },
    overrideAccess: false,
    user: owner,
  })

describe('topics and difficulty levels', () => {
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

  it('makes a topic slug from its name, without diacritics', async () => {
    expect((await createTopic({ name: 'Sādhanā' })).slug).toBe('sadhana')
    expect((await createTopic({ name: 'Adhyātma', slug: 'The Self' })).slug).toBe('the-self')
  })

  it('refuses a slug that another topic has, naming it', async () => {
    await createTopic({ name: 'Dharma' })
    expect(await validationMessages(createTopic({ name: 'Dharma' }))).toEqual([
      'The slug "dharma" is already used. Choose another.',
    ])
  })

  it('refuses a topic whose name gives no slug, until one is typed', async () => {
    expect(await validationMessages(createTopic({ name: 'धर्म' }))).toEqual([SLUG_REQUIRED_MESSAGE])
    expect((await createTopic({ name: 'धर्म', slug: 'dharma' })).slug).toBe('dharma')
  })

  it('refuses a cover tint that is not a six-digit hex colour', async () => {
    await expect(
      payload.create({
        collection: 'topics',
        data: {
          name: 'Bhakti',
          question: 'q',
          order: 3,
          coverTint: { background: 'pink', text: '#4a241a' },
        },
        overrideAccess: false,
        user: owner,
      }),
    ).rejects.toThrow(/background/i)
  })

  it('shows topics and levels to the public, sorted by order', async () => {
    await createTopic({ name: 'Bhakti', order: 3 })
    await createTopic({ name: 'Dharma', order: 1 })
    await payload.create({
      collection: 'difficultyLevels',
      data: { name: 'Beginner', order: 1 },
      overrideAccess: false,
      user: owner,
    })
    const topics = await (await rest('GET', 'topics')).json()
    expect(topics.docs.map((topic: { name: string }) => topic.name)).toEqual(['Dharma', 'Bhakti'])
    const levels = await (await rest('GET', 'difficultyLevels')).json()
    expect(levels.docs.map((level: { name: string }) => level.name)).toEqual(['Beginner'])
  })

  it('lets only the owner change topics and levels', async () => {
    const topic = await createTopic({ name: 'Dharma' })
    const edit = await rest('PATCH', `topics/${topic.id}`, { key: ASSISTANT_KEY, body: { intro: 'x' } })
    expect(edit.status).toBe(403)
    const create = await rest('POST', 'difficultyLevels', {
      key: ASSISTANT_KEY,
      body: { name: 'Expert', order: 4 },
    })
    expect(create.status).toBe(403)
    expect((await rest('DELETE', `topics/${topic.id}`)).status).toBe(403)
  })

  it('keeps level names unique', async () => {
    const level = { name: 'Advanced', order: 3, needsPriorReading: true }
    await payload.create({ collection: 'difficultyLevels', data: level, overrideAccess: true })
    await expect(
      payload.create({ collection: 'difficultyLevels', data: level, overrideAccess: true }),
    ).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run and see it fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/int/topics-and-levels.int.spec.ts
```

Expected: FAIL, the modules don't exist.

- [ ] **Step 3: Create** `src/collections/shared/slug.ts`:

```ts
import {
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeValidateHook,
  type CollectionSlug,
  type TextField,
} from 'payload'

import { slugify } from '../../lib/slug'

export const SLUG_REQUIRED_MESSAGE =
  'Add a slug: the title has no letters a URL can use, such as Latin letters or digits.'

/** The slug field. Not `required`: the admin would demand it before the server can derive it. */
export const slugField = (description: string): TextField => ({
  name: 'slug',
  type: 'text',
  unique: true,
  index: true,
  admin: { position: 'sidebar', description },
})

/**
 * Makes the slug plain ASCII. A typed slug is cleaned; an empty one is made from `sourceField`
 * (`Māyā and the Rope` → `maya-and-the-rope`).
 */
export const deriveSlug =
  (sourceField: string): CollectionBeforeValidateHook =>
  ({ data }) => {
    if (!data) return data
    const typed = typeof data.slug === 'string' && data.slug.trim() !== '' ? data.slug : undefined
    const source: unknown = typed ?? data[sourceField]
    if (typeof source !== 'string') return data
    return { ...data, slug: slugify(source) || null }
  }

/**
 * A slug must be unique, and present whenever the document goes live: on publish for a
 * collection with drafts, on every save otherwise. The clash error names the slug.
 */
export const checkSlug: CollectionBeforeChangeHook = async ({
  collection,
  data,
  originalDoc,
  req,
}) => {
  const hasDrafts = Boolean(collection.versions && collection.versions.drafts)
  const goingLive = !hasDrafts || data._status === 'published'
  const slug: unknown = data.slug

  if (typeof slug !== 'string' || slug === '') {
    if (!goingLive) return data
    throw new ValidationError({
      collection: collection.slug,
      errors: [{ path: 'slug', message: SLUG_REQUIRED_MESSAGE }],
    })
  }

  const { totalDocs } = await req.payload.count({
    collection: collection.slug as CollectionSlug,
    where: {
      and: [
        { slug: { equals: slug } },
        ...(originalDoc?.id === undefined ? [] : [{ id: { not_equals: originalDoc.id } }]),
      ],
    },
    overrideAccess: true,
    req,
  })
  if (totalDocs > 0) {
    throw new ValidationError({
      collection: collection.slug,
      errors: [{ path: 'slug', message: `The slug "${slug}" is already used. Choose another.` }],
    })
  }
  return data
}
```

- [ ] **Step 4: Create** `src/collections/Topics.ts`:

```ts
import type { CollectionConfig, TextFieldSingleValidation } from 'payload'

import { anyone, ownerOnly } from '../access/roles'
import { checkSlug, deriveSlug, slugField } from './shared/slug'

const hexColour: TextFieldSingleValidation = (value) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
    ? true
    : 'Use a six-digit hex colour, such as #e3cfa8.'

/** The four doors (website design 5.1). Starting data comes from a migration (Task 16). */
export const Topics: CollectionConfig = {
  slug: 'topics',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'question', 'order'] },
  defaultSort: 'order',
  access: { read: anyone, create: ownerOnly, update: ownerOnly, delete: ownerOnly },
  hooks: {
    beforeValidate: [deriveSlug('name')],
    beforeChange: [checkSlug],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('Plain ASCII, made from the name when left empty.'),
    { name: 'question', type: 'text', required: true },
    { name: 'intro', type: 'textarea' },
    { name: 'order', type: 'number', required: true },
    {
      name: 'coverTint',
      type: 'group',
      fields: [
        { name: 'background', type: 'text', required: true, validate: hexColour },
        { name: 'text', type: 'text', required: true, validate: hexColour },
      ],
    },
  ],
}
```

- [ ] **Step 5: Create** `src/collections/DifficultyLevels.ts`:

```ts
import type { CollectionConfig } from 'payload'

import { anyone, ownerOnly } from '../access/roles'

/**
 * Owner-edited, so the labels can follow Q-01 without a code change. The publish rule reads
 * `needsPriorReading`, never a level's name (stage 2 design 3.3).
 */
export const DifficultyLevels: CollectionConfig = {
  slug: 'difficultyLevels',
  labels: { singular: 'Difficulty level', plural: 'Difficulty levels' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'order', 'needsPriorReading'] },
  defaultSort: 'order',
  access: { read: anyone, create: ownerOnly, update: ownerOnly, delete: ownerOnly },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea' },
    { name: 'order', type: 'number', required: true },
    {
      name: 'needsPriorReading',
      label: 'Needs prior reading',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Articles at this level need at least one suggested prior reading to publish.',
      },
    },
  ],
}
```

- [ ] **Step 6: Register them.** In `src/payload.config.ts`, add the imports next to `Media`:

```ts
import { DifficultyLevels } from './collections/DifficultyLevels'
import { Topics } from './collections/Topics'
```

and change `collections: [Users, Media],` to `collections: [Users, Topics, DifficultyLevels, Media],`.

- [ ] **Step 7: Regenerate types, run and see it pass**

```bash
npm run generate:types
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/int/topics-and-levels.int.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
npx prettier --write src tests
npm run lint && npm run typecheck
git add src/collections/shared/slug.ts src/collections/Topics.ts src/collections/DifficultyLevels.ts src/payload.config.ts src/payload-types.ts tests/int/topics-and-levels.int.spec.ts
git commit -m "feat: topics and owner-edited difficulty levels, with ASCII slugs"
```

### Task 12: Editor blocks, the articles collection and the drafts-only guard

**Files:**
- Create: `src/blocks/Verse.ts`, `src/blocks/Tradition.ts`, `src/blocks/Practice.ts`, `src/blocks/content-editor.ts`, `src/collections/articles/drafts-only.ts`, `src/collections/articles/Articles.ts`
- Modify: `src/payload.config.ts`, `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js` (generated)
- Test: `tests/int/articles-access.int.spec.ts`

This task builds the collection with every field and its access. Tasks 13 and 14 add the save-time hooks. A publish in this task's tests already supplies a difficulty level, so they keep passing once the publish rules arrive.

- [ ] **Step 1: Write the failing test** in `tests/int/articles-access.int.spec.ts`:

```ts
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { DRAFTS_ONLY_MESSAGE } from '@/collections/articles/drafts-only'
import config from '@/payload.config'
import type { DifficultyLevel, User } from '@/payload-types'

import { ASSISTANT_KEY, clearContent, createStaff, rest } from '../helpers/content'

let payload: Payload
let owner: User
let level: DifficultyLevel

const publishAsOwner = (title = 'Live') =>
  payload.create({
    collection: 'articles',
    data: { title, shape: 'vani-note', difficulty: level.id, _status: 'published' },
    overrideAccess: false,
    user: owner,
  })

const live = (id: number) =>
  payload.findByID({ collection: 'articles', id, overrideAccess: true })

const expectRefused = async (response: Response) => {
  expect(response.status).toBe(403)
  expect(JSON.stringify(await response.json())).toContain(DRAFTS_ONLY_MESSAGE)
}

describe('articles: who can do what', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearContent(payload)
    ;({ owner } = await createStaff(payload))
    level = await payload.create({
      collection: 'difficultyLevels',
      data: { name: 'Beginner', order: 1, needsPriorReading: false },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  describe('the assistant', () => {
    it('creates a draft through REST with ?draft=true', async () => {
      const response = await rest('POST', 'articles?draft=true', {
        key: ASSISTANT_KEY,
        body: { title: 'A draft' },
      })
      expect(response.status).toBe(201)
      expect((await response.json()).doc._status).toBe('draft')
    })

    it('cannot set the approval, publishedAt or the editorial checklist', async () => {
      const response = await rest('POST', 'articles?draft=true', {
        key: ASSISTANT_KEY,
        body: {
          title: 'Forged',
          approval: { versionId: 'forged', approvedAt: '2020-01-01T00:00:00.000Z' },
          publishedAt: '2020-01-01T00:00:00.000Z',
          emailSentAt: '2020-01-01T00:00:00.000Z',
          editorialChecklist: { integrity: { quotesLocated: true } },
        },
      })
      const { doc } = await response.json()
      const stored = await payload.findByID({
        collection: 'articles',
        id: doc.id,
        draft: true,
        overrideAccess: true,
      })
      expect(stored.approval?.versionId ?? null).toBeNull()
      expect(stored.approval?.approvedAt ?? null).toBeNull()
      expect(stored.publishedAt ?? null).toBeNull()
      expect(stored.emailSentAt ?? null).toBeNull()
      expect(stored.editorialChecklist?.integrity?.quotesLocated ?? false).toBe(false)
    })

    it('is refused a save without ?draft=true', async () => {
      await expectRefused(await rest('POST', 'articles', { key: ASSISTANT_KEY, body: { title: 'x' } }))
    })

    it('is refused publishing, even with ?draft=true', async () => {
      await expectRefused(
        await rest('POST', 'articles?draft=true', {
          key: ASSISTANT_KEY,
          body: { title: 'x', _status: 'published' },
        }),
      )
    })

    it('drafts over a published article without changing the live one', async () => {
      const article = await publishAsOwner('Live title')
      const response = await rest('PATCH', `articles/${article.id}?draft=true`, {
        key: ASSISTANT_KEY,
        body: { title: 'Proposed title' },
      })
      expect(response.status).toBe(200)

      const current = await live(article.id)
      expect(current.title).toBe('Live title')
      expect(current._status).toBe('published')
      const latest = await payload.findByID({
        collection: 'articles',
        id: article.id,
        draft: true,
        overrideAccess: true,
      })
      expect(latest.title).toBe('Proposed title')
    })

    it('is refused an update without ?draft=true, which would unpublish', async () => {
      const article = await publishAsOwner()
      await expectRefused(
        await rest('PATCH', `articles/${article.id}`, {
          key: ASSISTANT_KEY,
          body: { _status: 'draft' },
        }),
      )
      expect((await live(article.id))._status).toBe('published')
    })

    it('is refused restoring a version, duplicating and bulk updates', async () => {
      const article = await publishAsOwner()
      const versions = await payload.findVersions({
        collection: 'articles',
        where: { parent: { equals: article.id } },
        overrideAccess: true,
      })
      await expectRefused(
        await rest('POST', `articles/versions/${versions.docs[0].id}`, { key: ASSISTANT_KEY }),
      )
      await expectRefused(
        await rest('POST', `articles/${article.id}/duplicate?draft=true`, {
          key: ASSISTANT_KEY,
          body: {},
        }),
      )
      await expectRefused(
        await rest('PATCH', `articles?draft=true&where[id][equals]=${article.id}`, {
          key: ASSISTANT_KEY,
          body: { title: 'bulk' },
        }),
      )
    })

    it('is refused deleting', async () => {
      const article = await publishAsOwner()
      expect((await rest('DELETE', `articles/${article.id}`, { key: ASSISTANT_KEY })).status).toBe(403)
      expect((await live(article.id)).id).toBe(article.id)
    })

    it('reads drafts and versions', async () => {
      await payload.create({
        collection: 'articles',
        data: { title: 'Draft' },
        draft: true,
        overrideAccess: true,
      })
      const drafts = await (await rest('GET', 'articles?draft=true', { key: ASSISTANT_KEY })).json()
      expect(drafts.docs.map((doc: { title: string }) => doc.title)).toEqual(['Draft'])
      expect((await rest('GET', 'articles/versions', { key: ASSISTANT_KEY })).status).toBe(200)
    })
  })

  describe('the public', () => {
    it('sees published articles only, without the approval, email record or checklist', async () => {
      await publishAsOwner('Live')
      await payload.create({
        collection: 'articles',
        data: { title: 'Draft' },
        draft: true,
        overrideAccess: true,
      })
      const { docs } = await (await rest('GET', 'articles')).json()
      expect(docs.map((doc: { title: string }) => doc.title)).toEqual(['Live'])
      expect(docs[0].approval).toBeUndefined()
      expect(docs[0].emailSentAt).toBeUndefined()
      expect(docs[0].emailRecipients).toBeUndefined()
      expect(docs[0].editorialChecklist).toBeUndefined()
      expect(docs[0].publishedAt).toBeDefined()
    })

    it('cannot read versions or write anything', async () => {
      expect((await rest('GET', 'articles/versions')).status).toBe(403)
      expect((await rest('POST', 'articles?draft=true', { body: { title: 'x' } })).status).toBe(403)
    })
  })

  describe('the owner', () => {
    it('unpublishes, keeping publishedAt and the approval', async () => {
      const article = await publishAsOwner()
      const unpublished = await payload.update({
        collection: 'articles',
        id: article.id,
        data: { _status: 'draft' },
        overrideAccess: false,
        user: owner,
      })
      expect(unpublished._status).toBe('draft')
      expect(unpublished.publishedAt).toBe(article.publishedAt)
      expect((await rest('GET', 'articles')).ok).toBe(true)
      expect((await (await rest('GET', 'articles')).json()).docs).toEqual([])
    })

    it('deletes', async () => {
      const article = await publishAsOwner()
      await payload.delete({ collection: 'articles', id: article.id, overrideAccess: false, user: owner })
      expect((await payload.count({ collection: 'articles', overrideAccess: true })).totalDocs).toBe(0)
    })
  })
})
```

The tests that look at `publishedAt` depend on Task 14. Until then, `publishedAt` stays empty, so expect these failures in this task, and only these:

- `sees published articles only…` fails at `expect(docs[0].publishedAt).toBeDefined()`.
- `unpublishes, keeping publishedAt…` passes, because both values are `undefined`.

- [ ] **Step 2: Run and see it fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/int/articles-access.int.spec.ts
```

Expected: FAIL, the modules don't exist.

- [ ] **Step 3: Create the blocks.** `src/blocks/Verse.ts`:

```ts
import type { Block } from 'payload'

/** A quoted verse: the text layer of the handbook's four layers (03 Editorial integrity). */
export const Verse: Block = {
  slug: 'verse',
  interfaceName: 'VerseBlock',
  labels: { singular: 'Verse', plural: 'Verses' },
  fields: [
    { name: 'devanagari', type: 'textarea' },
    { name: 'transliteration', type: 'textarea', required: true },
    { name: 'translation', type: 'textarea', required: true },
    { name: 'textName', label: 'Text', type: 'text', required: true },
    {
      name: 'location',
      type: 'text',
      required: true,
      admin: { description: 'The exact location, for example 2.47.' },
    },
    { name: 'translator', label: 'Translator or edition', type: 'text', required: true },
  ],
}
```

`src/blocks/Tradition.ts`:

```ts
import type { Block } from 'payload'

/** A named school's interpretation: the tradition layer. The school or teacher is always named. */
export const Tradition: Block = {
  slug: 'tradition',
  interfaceName: 'TraditionBlock',
  labels: { singular: 'Tradition', plural: 'Traditions' },
  fields: [
    { name: 'school', label: 'School or teacher', type: 'text', required: true },
    { name: 'interpretation', type: 'textarea', required: true },
  ],
}
```

`src/blocks/Practice.ts`:

```ts
import type { Block } from 'payload'

/** An invitation to practice: the practice layer. */
export const Practice: Block = {
  slug: 'practice',
  interfaceName: 'PracticeBlock',
  labels: { singular: 'Practice', plural: 'Practices' },
  fields: [{ name: 'invitation', type: 'textarea', required: true }],
}
```

`src/blocks/content-editor.ts`:

```ts
import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'

import { Practice } from './Practice'
import { Tradition } from './Tradition'
import { Verse } from './Verse'

/**
 * The editor for article and page bodies. It has Payload's default features, including images
 * through the upload feature, plus the Verse, Tradition and Practice blocks. Reflection is
 * ordinary text. Embedded relationships are left out: the spec has no use for them, and they
 * could embed any collection, users included.
 */
export const contentEditor = lexicalEditor({
  features: ({ defaultFeatures }) => [
    ...defaultFeatures.filter((feature) => feature.key !== 'relationship'),
    BlocksFeature({ blocks: [Verse, Tradition, Practice] }),
  ],
})
```

- [ ] **Step 4: Create the guard** `src/collections/articles/drafts-only.ts`:

```ts
import { APIError, type CollectionBeforeOperationHook } from 'payload'

import { isOwner } from '../../access/roles'

export const DRAFTS_ONLY_MESSAGE = 'The assistant saves drafts only; the owner publishes.'

// Operations that only read. Everything else an assistant asks for is a write and must be a draft.
const READ_OPERATIONS = new Set(['count', 'countVersions', 'read', 'readDistinct'])

// The operation arguments this guard reads. Payload's REST endpoints parse `?draft=true` into
// `draft: true`. Collection hooks after this one never see the flag, which is why the check is here.
type WriteArgs = {
  data?: { _status?: unknown }
  draft?: unknown
  duplicateFromID?: unknown
  id?: unknown
}

const refuse = (): never => {
  throw new APIError(DRAFTS_ONLY_MESSAGE, 403, undefined, true)
}

/**
 * Keeps every signed-in account except the owner to draft saves (stage 2 design, 4.2). A draft
 * save of a published article only adds a version, so the live article is untouched. Refuses
 * publishing, non-draft updates (which would unpublish), duplicating, bulk updates, deletes and
 * version restores. Requests with no user are left to access control.
 */
export const draftsOnlyForAssistant: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (!req.user || isOwner(req.user) || READ_OPERATIONS.has(operation)) return args
  if (operation !== 'create' && operation !== 'update') return refuse()

  const write = args as WriteArgs
  if (write.draft !== true || write.data?._status === 'published') return refuse()
  if (operation === 'create' && write.duplicateFromID !== undefined) return refuse()
  if (operation === 'update' && write.id === undefined) return refuse()
  return args
}
```

- [ ] **Step 5: Create** `src/collections/articles/Articles.ts`:

```ts
import type { CollectionConfig } from 'payload'

import { nobody, ownerOnly, publishedOrStaff, staffOnly, staffOnlyField } from '../../access/roles'
import { contentEditor } from '../../blocks/content-editor'
import { draftsOnlyForAssistant } from './drafts-only'
import { editorialChecklist } from './editorial-checklist'

export const ARTICLE_SHAPES = [
  { label: 'Vani Note', value: 'vani-note' },
  { label: 'Inquiry Essay', value: 'inquiry-essay' },
  { label: 'Text / Story Study', value: 'text-story-study' },
  { label: 'Practice Journal', value: 'practice-journal' },
]

export const SOURCE_TYPES = [
  { label: 'Primary text', value: 'primary-text' },
  { label: 'Commentary', value: 'commentary' },
  { label: 'Academic', value: 'academic' },
  { label: 'Living tradition', value: 'living-tradition' },
  { label: 'General', value: 'general' },
]

/** Fields only the server writes, in hooks: no API request can set them, the owner's included. */
const SERVER_ONLY = { create: nobody, update: nobody }
/** Server-only, and never shown to the public. */
const SERVER_ONLY_STAFF_READ = { read: staffOnlyField, ...SERVER_ONLY }

const isInternal = (_: unknown, sibling: { kind?: unknown }): boolean => sibling?.kind === 'internal'
const isExternal = (_: unknown, sibling: { kind?: unknown }): boolean => sibling?.kind !== 'internal'

export const Articles: CollectionConfig = {
  slug: 'articles',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'shape', '_status', 'updatedAt'],
  },
  versions: {
    drafts: { autosave: { interval: 2000 } },
    // Keep every version: the approval record points at one by id.
    maxPerDoc: 0,
  },
  access: {
    read: publishedOrStaff,
    readVersions: staffOnly,
    create: staffOnly,
    update: staffOnly,
    delete: ownerOnly,
  },
  hooks: {
    beforeOperation: [draftsOnlyForAssistant],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'summary',
      type: 'textarea',
      admin: { description: 'One sentence, shown under the title and in lists.' },
    },
    { name: 'shape', type: 'select', required: true, options: ARTICLE_SHAPES },
    { name: 'topics', type: 'relationship', relationTo: 'topics', hasMany: true },
    {
      name: 'difficulty',
      type: 'relationship',
      relationTo: 'difficultyLevels',
      admin: { description: 'Required to publish.' },
    },
    { name: 'background', label: 'Helpful background', type: 'textarea' },
    {
      name: 'readFirst',
      label: 'Suggested prior reading',
      labels: { singular: 'Prior reading', plural: 'Prior readings' },
      type: 'array',
      fields: [
        {
          name: 'kind',
          type: 'radio',
          required: true,
          defaultValue: 'external',
          options: [
            { label: 'SageVani article', value: 'internal' },
            { label: 'Elsewhere', value: 'external' },
          ],
        },
        {
          name: 'article',
          type: 'relationship',
          relationTo: 'articles',
          admin: { condition: isInternal },
        },
        { name: 'title', type: 'text', admin: { condition: isExternal } },
        { name: 'author', type: 'text', admin: { condition: isExternal } },
        { name: 'url', label: 'URL', type: 'text', admin: { condition: isExternal } },
        { name: 'reason', label: 'Why it helps', type: 'textarea' },
      ],
    },
    { name: 'body', type: 'richText', editor: contentEditor },
    {
      name: 'sources',
      type: 'array',
      labels: { singular: 'Source', plural: 'Sources' },
      fields: [
        { name: 'type', type: 'select', required: true, options: SOURCE_TYPES },
        { name: 'work', type: 'text', required: true },
        { name: 'author', label: 'Author or commentator', type: 'text' },
        { name: 'edition', label: 'Edition or translator', type: 'text' },
        { name: 'location', label: 'Exact location', type: 'text' },
        { name: 'url', label: 'URL', type: 'text' },
        { name: 'accessedOn', label: 'Access date', type: 'date' },
        { name: 'claim', label: 'Claim supported', type: 'textarea' },
      ],
    },
    {
      name: 'coverTerm',
      type: 'text',
      admin: { description: 'Drawn on the generated cover; the title is used when empty.' },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Replaces the generated cover.' },
    },
    {
      name: 'corrections',
      type: 'array',
      labels: { singular: 'Correction', plural: 'Corrections' },
      fields: [
        { name: 'date', type: 'date', required: true },
        { name: 'change', label: 'What changed', type: 'textarea', required: true },
        { name: 'showPublicNote', label: 'Show a public note', type: 'checkbox', defaultValue: true },
      ],
    },
    {
      name: 'seo',
      label: 'SEO',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
      ],
    },
    editorialChecklist,
    // Sidebar
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'Plain ASCII, made from the title when left empty.' },
    },
    {
      name: 'sendEmail',
      label: 'Email subscribers on first publish',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      access: SERVER_ONLY,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'readingTime',
      label: 'Reading time (minutes)',
      type: 'number',
      access: SERVER_ONLY,
      admin: { position: 'sidebar', readOnly: true },
    },
    { name: 'searchText', type: 'textarea', access: SERVER_ONLY, admin: { hidden: true } },
    {
      name: 'approval',
      type: 'group',
      access: SERVER_ONLY_STAFF_READ,
      admin: { position: 'sidebar', readOnly: true },
      fields: [
        { name: 'approvedBy', type: 'relationship', relationTo: 'users' },
        { name: 'approvedAt', type: 'date' },
        { name: 'versionId', type: 'text' },
      ],
    },
    {
      name: 'emailSentAt',
      type: 'date',
      access: SERVER_ONLY_STAFF_READ,
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'emailRecipients',
      type: 'number',
      access: SERVER_ONLY_STAFF_READ,
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
```

The slug field is written out here. Task 13 replaces it with `slugField(…)` and adds the slug hooks.

- [ ] **Step 6: Register it.** In `src/payload.config.ts`, add `import { Articles } from './collections/articles/Articles'` next to the other collection imports, and change the collections line to:

```ts
  collections: [Users, Articles, Topics, DifficultyLevels, Media],
```

- [ ] **Step 7: Regenerate types and the import map, run, and see only the expected failure**

```bash
npm run generate:types && npm run generate:importmap
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/int/articles-access.int.spec.ts
```

Expected: everything passes except `sees published articles only, without the approval, email record or checklist`. That test fails at `publishedAt`, until Task 14. Payload logs an `APIError: The assistant saves drafts only…` line for each refused request; that's expected.

- [ ] **Step 8: Commit**

```bash
npx prettier --write src tests
npm run lint && npm run typecheck
git add src/blocks src/collections/articles/drafts-only.ts src/collections/articles/Articles.ts src/payload.config.ts src/payload-types.ts "src/app/(payload)/admin/importMap.js" tests/int/articles-access.int.spec.ts
git commit -m "feat: articles with Verse, Tradition and Practice blocks; the assistant saves drafts only"
```

### Task 13: Slug, reading time and search text on save

**Files:**
- Create: `src/collections/articles/derived-text.ts`, `tests/helpers/lexical.ts`
- Modify: `src/collections/articles/Articles.ts`
- Test: `tests/int/articles-fields.int.spec.ts`

- [ ] **Step 1: Create the editor-content helper** `tests/helpers/lexical.ts`. Tests use it to build article bodies:

```ts
import { randomBytes, randomUUID } from 'crypto'

import type { Article } from '@/payload-types'

type RichText = NonNullable<Article['body']>
type LexicalNode = RichText['root']['children'][number]

const blockId = (): string => randomBytes(12).toString('hex')

export const paragraph = (text: string): LexicalNode => ({
  type: 'paragraph',
  version: 1,
  format: '',
  indent: 0,
  direction: 'ltr',
  textFormat: 0,
  children: [{ type: 'text', version: 1, text, format: 0, mode: 'normal', style: '', detail: 0 }],
})

export const verse = (fields: {
  devanagari?: string
  transliteration: string
  translation: string
  textName: string
  location: string
  translator: string
}): LexicalNode => ({
  type: 'block',
  version: 2,
  format: '',
  fields: { id: blockId(), blockName: '', blockType: 'verse', ...fields },
})

export const image = (mediaId: number): LexicalNode => ({
  type: 'upload',
  version: 3,
  format: '',
  id: randomUUID(),
  relationTo: 'media',
  value: mediaId,
  fields: null,
})

export const richText = (...children: LexicalNode[]): RichText => ({
  root: { type: 'root', version: 1, format: '', indent: 0, direction: 'ltr', children },
})
```

- [ ] **Step 2: Write the failing test** in `tests/int/articles-fields.int.spec.ts`:

```ts
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { SLUG_REQUIRED_MESSAGE } from '@/collections/shared/slug'
import config from '@/payload.config'
import type { DifficultyLevel, User } from '@/payload-types'

import { clearContent, createStaff, validationMessages } from '../helpers/content'
import { paragraph, richText, verse } from '../helpers/lexical'

let payload: Payload
let owner: User
let level: DifficultyLevel

const draft = (data: { title: string; slug?: string; summary?: string; body?: unknown }) =>
  payload.create({
    collection: 'articles',
    data: data as { title: string },
    draft: true,
    overrideAccess: false,
    user: owner,
  })

describe('articles: fields the server fills in', () => {
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

  it('makes the slug from the title, without diacritics', async () => {
    expect((await draft({ title: 'Māyā and the Rope' })).slug).toBe('maya-and-the-rope')
  })

  it('cleans a typed slug', async () => {
    expect((await draft({ title: 'x', slug: 'Śiva, Then  Ṛta' })).slug).toBe('siva-then-rta')
  })

  it('refuses a slug another article has, naming it', async () => {
    await draft({ title: 'Karma' })
    expect(await validationMessages(draft({ title: 'Karma' }))).toEqual([
      'The slug "karma" is already used. Choose another.',
    ])
  })

  it('lets a draft have no slug, but not a published article', async () => {
    expect((await draft({ title: 'कर्म' })).slug ?? null).toBeNull()
    const publish = payload.create({
      collection: 'articles',
      data: { title: 'कर्म', shape: 'vani-note', difficulty: level.id, _status: 'published' },
      overrideAccess: false,
      user: owner,
    })
    expect(await validationMessages(publish)).toEqual([SLUG_REQUIRED_MESSAGE])
  })

  it('counts reading time from the body, block text included', async () => {
    const words = (count: number) => Array.from({ length: count }, () => 'word').join(' ')
    const article = await draft({
      title: 't',
      body: richText(
        paragraph(words(150)),
        verse({
          transliteration: words(30),
          translation: words(30),
          textName: 'Gītā',
          location: '2.47',
          translator: 'T',
        }),
      ),
    })
    expect(article.readingTime).toBe(2)
  })

  it('stores search text without diacritics, from title, summary and body', async () => {
    const article = await draft({
      title: 'Māyā and the Rope',
      summary: 'On Śaṅkara.',
      body: richText(
        verse({
          transliteration: 'karmaṇy evādhikāras te',
          translation: 'Your right is to action alone.',
          textName: 'Bhagavad Gītā',
          location: '2.47',
          translator: 'T',
        }),
      ),
    })
    expect(article.searchText).toContain('maya and the rope')
    expect(article.searchText).toContain('on sankara.')
    expect(article.searchText).toContain('karmany evadhikaras te')
    expect(article.searchText).toContain('bhagavad gita')
  })

  it('cannot have its reading time or search text set through the API', async () => {
    const article = await payload.create({
      collection: 'articles',
      data: { title: 'Short', readingTime: 99, searchText: 'forged' },
      draft: true,
      overrideAccess: false,
      user: owner,
    })
    expect(article.readingTime).toBe(1)
    expect(article.searchText).toBe('short')
  })
})
```

- [ ] **Step 3: Run and see it fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/int/articles-fields.int.spec.ts
```

Expected: FAIL. Slugs aren't derived, and `readingTime` and `searchText` are empty.

- [ ] **Step 4: Create** `src/collections/articles/derived-text.ts`:

```ts
import type { CollectionBeforeChangeHook } from 'payload'

import { readingTime, searchTextFrom } from '../../lib/article-text'
import { countWords, extractText } from '../../lib/rich-text'

/** Reading time and search text, recomputed on every save, drafts included. */
export const deriveArticleText: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const body: unknown = data.body !== undefined ? data.body : originalDoc?.body
  const bodyText = extractText(body)
  return {
    ...data,
    readingTime: readingTime(countWords(bodyText)),
    searchText: searchTextFrom([
      data.title ?? originalDoc?.title,
      data.summary ?? originalDoc?.summary,
      bodyText,
    ]),
  }
}
```

- [ ] **Step 5: Wire it, and the slug hooks, into the collection.** In `src/collections/articles/Articles.ts`, add these imports:

```ts
import { checkSlug, deriveSlug, slugField } from '../shared/slug'
import { deriveArticleText } from './derived-text'
```

replace:

```ts
  hooks: {
    beforeOperation: [draftsOnlyForAssistant],
  },
```

with:

```ts
  hooks: {
    beforeOperation: [draftsOnlyForAssistant],
    beforeValidate: [deriveSlug('title')],
    beforeChange: [checkSlug, deriveArticleText],
  },
```

and replace the written-out slug field:

```ts
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'Plain ASCII, made from the title when left empty.' },
    },
```

with:

```ts
    slugField('Plain ASCII, made from the title when left empty.'),
```

- [ ] **Step 6: Run and see it pass**

```bash
npm run generate:types
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/int/articles-fields.int.spec.ts tests/int/articles-access.int.spec.ts
```

Expected: `articles-fields` passes. `articles-access` has the same single expected failure as in Task 12.

- [ ] **Step 7: Commit**

```bash
npx prettier --write src tests
npm run lint && npm run typecheck
git add src/collections/articles src/payload-types.ts tests/int/articles-fields.int.spec.ts tests/helpers/lexical.ts
git commit -m "feat: article slugs, reading time and search text on every save"
```

### Task 14: The publish rules and the approval record

**Files:**
- Create: `src/collections/articles/publish-rules.ts`, `src/collections/articles/approval.ts`
- Modify: `src/collections/articles/Articles.ts`
- Test: `tests/int/articles-publishing.int.spec.ts`

- [ ] **Step 1: Write the failing test** in `tests/int/articles-publishing.int.spec.ts`:

```ts
import { getPayload, ValidationError, type Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { PUBLISH_MESSAGES } from '@/lib/publish-rules'
import config from '@/payload.config'
import type { Article, DifficultyLevel, User } from '@/payload-types'

import { ASSISTANT_KEY, clearContent, createStaff, rest } from '../helpers/content'
import { image, paragraph, richText } from '../helpers/lexical'

let payload: Payload
let owner: User
let beginner: DifficultyLevel
let advanced: DifficultyLevel

type ArticleData = Partial<Omit<Article, 'id' | 'updatedAt' | 'createdAt'>>

const publish = (data: ArticleData) =>
  payload.create({
    collection: 'articles',
    data: { title: 'An article', shape: 'vani-note', ...data, _status: 'published' } as Article,
    overrideAccess: false,
    user: owner,
  })

const newestVersionId = async (id: number) => {
  const { docs } = await payload.findVersions({
    collection: 'articles',
    where: { parent: { equals: id } },
    sort: '-createdAt',
    limit: 1,
    overrideAccess: true,
  })
  return String(docs[0].id)
}

/** The rule problems a publish attempt fails with, as `{ path, message }` pairs. */
const problemsOf = async (attempt: Promise<unknown>) => {
  const error = await attempt.then(
    () => undefined,
    (thrown: unknown) => thrown,
  )
  expect(error).toBeInstanceOf(ValidationError)
  return (error as ValidationError).data.errors.map(({ path, message }) => ({ path, message }))
}

describe('articles: publishing', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearContent(payload)
    ;({ owner } = await createStaff(payload))
    beginner = await payload.create({
      collection: 'difficultyLevels',
      data: { name: 'Beginner', order: 1, needsPriorReading: false },
      overrideAccess: true,
    })
    advanced = await payload.create({
      collection: 'difficultyLevels',
      data: { name: 'Advanced', order: 3, needsPriorReading: true },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  describe('the approval record', () => {
    it('records the approver, the time and the published version', async () => {
      const article = await publish({ difficulty: beginner.id, summary: 'One line.' })
      const stored = await payload.findByID({ collection: 'articles', id: article.id, overrideAccess: true })

      expect(stored.approval?.versionId).toBe(await newestVersionId(article.id))
      const approvedBy = stored.approval?.approvedBy
      expect(typeof approvedBy === 'object' ? approvedBy?.id : approvedBy).toBe(owner.id)
      expect(stored.approval?.approvedAt).toBeTruthy()
      expect(stored.publishedAt).toBeTruthy()
      expect(stored.summary).toBe('One line.')
    })

    it('keeps publishedAt from the first publish and records a new approval each time', async () => {
      const first = await publish({ difficulty: beginner.id })
      const second = await payload.update({
        collection: 'articles',
        id: first.id,
        data: { title: 'Edited', _status: 'published' },
        overrideAccess: false,
        user: owner,
      })
      expect(second.publishedAt).toBe(first.publishedAt)
      expect(second.approval?.versionId).not.toBe(first.approval?.versionId)
      expect(second.approval?.versionId).toBe(await newestVersionId(first.id))
    })

    it('is not changed by a later draft', async () => {
      const article = await publish({ difficulty: beginner.id })
      await rest('PATCH', `articles/${article.id}?draft=true`, {
        key: ASSISTANT_KEY,
        body: { title: 'Proposed' },
      })
      const stored = await payload.findByID({ collection: 'articles', id: article.id, overrideAccess: true })
      expect(stored.approval?.versionId).toBe(article.approval?.versionId)
    })

    it('is not made when saving a draft', async () => {
      const article = await payload.create({
        collection: 'articles',
        data: { title: 'Draft' },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      expect(article.approval?.approvedAt ?? null).toBeNull()
      expect(article.publishedAt ?? null).toBeNull()
    })
  })

  describe('the publish rules', () => {
    it('need a difficulty level', async () => {
      expect(await problemsOf(publish({}))).toEqual([
        { path: 'difficulty', message: PUBLISH_MESSAGES.difficulty },
      ])
    })

    it('need a prior reading when the level asks for one', async () => {
      expect(await problemsOf(publish({ difficulty: advanced.id }))).toEqual([
        { path: 'readFirst', message: PUBLISH_MESSAGES.readFirst },
      ])
      const article = await publish({
        difficulty: advanced.id,
        readFirst: [{ kind: 'external', title: 'Bhagavad Gītā, chapter 2' }],
      })
      expect(article._status).toBe('published')
    })

    it('need a source for a Text / Story Study, and list every problem at once', async () => {
      const problems = await problemsOf(publish({ shape: 'text-story-study', difficulty: advanced.id }))
      expect(problems.map((problem) => problem.path)).toEqual(['readFirst', 'sources'])
    })

    it('need alt text on every image in the body', async () => {
      const data = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } })
        .png()
        .toBuffer()
      const blank = await payload.create({
        collection: 'media',
        data: { alt: '   ', creator: 'c', source: 's', licence: 'l' },
        file: { data, mimetype: 'image/png', name: 'x.png', size: data.length },
        overrideAccess: true,
      })
      expect(
        await problemsOf(
          publish({ difficulty: beginner.id, body: richText(paragraph('Text.'), image(blank.id)) }),
        ),
      ).toEqual([{ path: 'body', message: PUBLISH_MESSAGES.imageAlt(blank.id) }])
    })

    it('do not apply to drafts', async () => {
      const article = await payload.create({
        collection: 'articles',
        data: { title: 'Unfinished', shape: 'text-story-study' },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      expect(article._status).toBe('draft')
    })
  })
})
```

- [ ] **Step 2: Run and see it fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/int/articles-publishing.int.spec.ts
```

Expected: FAIL. Publishing succeeds without a difficulty level, and no approval is recorded.

- [ ] **Step 3: Create** `src/collections/articles/publish-rules.ts`:

```ts
import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { publishProblems, type PublishCheckInput } from '../../lib/publish-rules'
import { findUploadIds } from '../../lib/rich-text'

const idOf = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const { id } = value as { id: unknown }
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

async function difficultyOf(value: unknown, req: PayloadRequest): Promise<PublishCheckInput['difficulty']> {
  const id = idOf(value)
  if (id === null) return null
  const level = await req.payload.findByID({
    collection: 'difficultyLevels',
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    req,
  })
  return level ? { needsPriorReading: level.needsPriorReading === true } : null
}

async function imagesOf(body: unknown, req: PayloadRequest): Promise<PublishCheckInput['images']> {
  const ids = findUploadIds(body)
  if (ids.length === 0) return []
  const { docs } = await req.payload.find({
    collection: 'media',
    where: { id: { in: ids } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const altById = new Map(docs.map((doc) => [String(doc.id), doc.alt]))
  return ids.map((id) => ({ id, alt: altById.get(String(id)) }))
}

/** Runs the publish rules whenever an article is published; drafts may be incomplete. */
export const enforcePublishRules: CollectionBeforeChangeHook = async ({ collection, data, req }) => {
  if (data._status !== 'published') return data
  const problems = publishProblems({
    shape: data.shape,
    difficulty: await difficultyOf(data.difficulty, req),
    readFirst: Array.isArray(data.readFirst) ? data.readFirst : [],
    sourceCount: Array.isArray(data.sources) ? data.sources.length : 0,
    images: await imagesOf(data.body, req),
  })
  if (problems.length > 0) throw new ValidationError({ collection: collection.slug, errors: problems })
  return data
}
```

- [ ] **Step 4: Create** `src/collections/articles/approval.ts`:

```ts
import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

type Approval = {
  approvedAt?: string | null
  approvedBy?: number | string | { id: number | string } | null
  versionId?: string | null
}

type ApprovableDoc = {
  _status?: 'draft' | 'published' | null
  approval?: Approval | null
  id: number | string
}

const idOf = (value: Approval['approvedBy']): number | string | null =>
  value !== null && typeof value === 'object' ? value.id : (value ?? null)

/**
 * Publishing is the owner's approval (website design, 8.3). Every save that publishes records
 * who approved it and when, and sets publishedAt the first time. The version id is not known
 * until Payload saves the version, so it starts empty and recordApprovedVersion fills it in.
 */
export const recordApproval: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (data._status !== 'published') return data
  const now = new Date().toISOString()
  return {
    ...data,
    publishedAt: originalDoc?.publishedAt ?? now,
    approval: { approvedBy: req.user?.id ?? null, approvedAt: now, versionId: null },
  }
}

/**
 * Runs after Payload has saved the version, so the newest version is the one just published.
 * Writes its id onto the live document only, through the database adapter, so no extra version
 * is created and no hooks run again.
 */
export const recordApprovedVersion: CollectionAfterChangeHook<ApprovableDoc> = async ({
  collection,
  doc,
  req,
}) => {
  if (doc._status !== 'published' || !doc.approval || doc.approval.versionId) return doc

  const { docs } = await req.payload.db.findVersions({
    collection: collection.slug,
    where: { parent: { equals: doc.id } },
    sort: '-createdAt',
    limit: 1,
    pagination: false,
    req,
  })
  const versionId = docs[0] ? String(docs[0].id) : null
  const approval = { ...doc.approval, approvedBy: idOf(doc.approval.approvedBy), versionId }

  await req.payload.db.updateOne({
    collection: collection.slug,
    id: doc.id,
    data: { approval },
    req,
  })
  return { ...doc, approval: { ...doc.approval, versionId } }
}
```

- [ ] **Step 5: Wire them in.** In `src/collections/articles/Articles.ts`, add:

```ts
import { recordApproval, recordApprovedVersion } from './approval'
import { enforcePublishRules } from './publish-rules'
```

and replace:

```ts
    beforeChange: [checkSlug, deriveArticleText],
```

with:

```ts
    beforeChange: [checkSlug, deriveArticleText, enforcePublishRules, recordApproval],
    afterChange: [recordApprovedVersion],
```

- [ ] **Step 6: Run every article test and see them pass**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/int/articles-publishing.int.spec.ts tests/int/articles-access.int.spec.ts tests/int/articles-fields.int.spec.ts
```

Expected: PASS, including the `publishedAt` test in `articles-access` that failed since Task 12.

- [ ] **Step 7: Commit**

```bash
npx prettier --write src tests
npm run lint && npm run typecheck
git add src/collections/articles tests/int/articles-publishing.int.spec.ts
git commit -m "feat: publish rules, and the approval record of the approved version"
```

### Task 15: Pages and site settings

**Files:**
- Create: `src/collections/Pages.ts`, `src/globals/SiteSettings.ts`
- Modify: `src/payload.config.ts`, `src/payload-types.ts` (generated)
- Test: `tests/int/pages-and-settings.int.spec.ts`

- [ ] **Step 1: Write the failing test** in `tests/int/pages-and-settings.int.spec.ts`:

```ts
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_TAGLINE } from '@/globals/SiteSettings'
import config from '@/payload.config'
import type { DifficultyLevel, User } from '@/payload-types'

import { ASSISTANT_KEY, clearContent, createStaff, rest } from '../helpers/content'

let payload: Payload
let owner: User
let level: DifficultyLevel

const article = (title: string, status: 'draft' | 'published') =>
  status === 'published'
    ? payload.create({
        collection: 'articles',
        data: { title, shape: 'vani-note', difficulty: level.id, _status: 'published' },
        overrideAccess: true,
      })
    : payload.create({ collection: 'articles', data: { title }, draft: true, overrideAccess: true })

describe('pages and site settings', () => {
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
    await payload.updateGlobal({
      slug: 'siteSettings',
      data: { featuredArticle: null, featuredPicks: [], startHere: [] },
      overrideAccess: true,
    })
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  describe('pages', () => {
    it('keep a half-written page off the site until it is published', async () => {
      await payload.create({
        collection: 'pages',
        data: { title: 'About' },
        draft: true,
        overrideAccess: false,
        user: owner,
      })
      expect((await (await rest('GET', 'pages')).json()).docs).toEqual([])

      await payload.create({
        collection: 'pages',
        data: { title: 'How SageVani writes', _status: 'published' },
        overrideAccess: false,
        user: owner,
      })
      const { docs } = await (await rest('GET', 'pages')).json()
      expect(docs.map((page: { slug: string }) => page.slug)).toEqual(['how-sagevani-writes'])
    })

    it('are the owner’s alone to write, even as drafts', async () => {
      const response = await rest('POST', 'pages?draft=true', {
        key: ASSISTANT_KEY,
        body: { title: 'About' },
      })
      expect(response.status).toBe(403)
    })
  })

  describe('site settings', () => {
    it('ship with the tagline, readable by the public', async () => {
      const settings = await (await rest('GET', 'globals/siteSettings')).json()
      expect(settings.tagline).toBe(DEFAULT_TAGLINE)
      expect(DEFAULT_TAGLINE).toBe('Where silence learns to speak.')
    })

    it('are the owner’s alone to change', async () => {
      const response = await rest('POST', 'globals/siteSettings', {
        key: ASSISTANT_KEY,
        body: { footerMotto: 'x' },
      })
      expect(response.status).toBe(403)
    })

    it('feature published articles only', async () => {
      const draft = await article('Draft', 'draft')
      await expect(
        payload.updateGlobal({
          slug: 'siteSettings',
          data: { featuredArticle: draft.id },
          overrideAccess: false,
          user: owner,
        }),
      ).rejects.toThrow(/featured ?article/i)

      const live = await article('Live', 'published')
      const settings = await payload.updateGlobal({
        slug: 'siteSettings',
        data: { featuredArticle: live.id },
        overrideAccess: false,
        user: owner,
      })
      const featured = settings.featuredArticle
      expect(typeof featured === 'object' ? featured?.id : featured).toBe(live.id)
    })

    it('hold at most three featured picks', async () => {
      const ids = await Promise.all(['a', 'b', 'c', 'd'].map(async (t) => (await article(t, 'published')).id))
      await expect(
        payload.updateGlobal({
          slug: 'siteSettings',
          data: { featuredPicks: ids },
          overrideAccess: false,
          user: owner,
        }),
      ).rejects.toThrow(/featured ?picks/i)
    })

    it('accept only site paths in the navigation', async () => {
      await expect(
        payload.updateGlobal({
          slug: 'siteSettings',
          data: { navigation: [{ label: 'Away', path: 'https://example.com' }] },
          overrideAccess: false,
          user: owner,
        }),
      ).rejects.toThrow(/path/i)
    })
  })
})
```

- [ ] **Step 2: Run and see it fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/int/pages-and-settings.int.spec.ts
```

Expected: FAIL, the modules don't exist.

- [ ] **Step 3: Create** `src/collections/Pages.ts`:

```ts
import type { CollectionConfig } from 'payload'

import { ownerOnly, publishedOrStaff, staffOnly } from '../access/roles'
import { contentEditor } from '../blocks/content-editor'
import { checkSlug, deriveSlug, slugField } from './shared/slug'

/**
 * About, How SageVani writes, Start here and Privacy. Drafts are on, so a half-written page
 * never goes live (stage 2 design 3.4). The owner writes them; the assistant only reads.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status', 'updatedAt'] },
  versions: { drafts: { autosave: { interval: 2000 } }, maxPerDoc: 0 },
  access: {
    read: publishedOrStaff,
    readVersions: staffOnly,
    create: ownerOnly,
    update: ownerOnly,
    delete: ownerOnly,
  },
  hooks: {
    beforeValidate: [deriveSlug('title')],
    beforeChange: [checkSlug],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'body', type: 'richText', editor: contentEditor },
    slugField('Plain ASCII, made from the title when left empty.'),
  ],
}
```

- [ ] **Step 4: Create** `src/globals/SiteSettings.ts`:

```ts
import type { GlobalConfig, TextFieldSingleValidation, Where } from 'payload'

import { anyone, ownerOnly } from '../access/roles'

export const DEFAULT_TAGLINE = 'Where silence learns to speak.'

// Only published articles can be featured; Payload checks this on save as well as in the picker.
const PUBLISHED: Where = { _status: { equals: 'published' } }

const sitePath: TextFieldSingleValidation = (value) =>
  typeof value === 'string' && /^\/(?!\/)\S*$/.test(value)
    ? true
    : 'Use a path on this site, starting with a single /, such as /articles.'

/** Curation and site-wide text (website design 5.3 and 8.6). */
export const SiteSettings: GlobalConfig = {
  slug: 'siteSettings',
  label: 'Site settings',
  access: { read: anyone, update: ownerOnly },
  fields: [
    { name: 'tagline', type: 'text', required: true, defaultValue: DEFAULT_TAGLINE },
    {
      name: 'featuredArticle',
      type: 'relationship',
      relationTo: 'articles',
      filterOptions: PUBLISHED,
    },
    {
      name: 'featuredPicks',
      type: 'relationship',
      relationTo: 'articles',
      hasMany: true,
      maxRows: 3,
      filterOptions: PUBLISHED,
    },
    {
      name: 'startHere',
      label: 'Start here',
      type: 'relationship',
      relationTo: 'articles',
      hasMany: true,
      filterOptions: PUBLISHED,
      admin: { description: 'In reading order.' },
    },
    {
      name: 'navigation',
      type: 'array',
      labels: { singular: 'Link', plural: 'Links' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'path', type: 'text', required: true, validate: sitePath },
      ],
    },
    { name: 'footerMotto', type: 'text' },
  ],
}
```

- [ ] **Step 5: Register them.** In `src/payload.config.ts`, add:

```ts
import { Pages } from './collections/Pages'
import { SiteSettings } from './globals/SiteSettings'
```

change the collections line to:

```ts
  collections: [Users, Articles, Pages, Topics, DifficultyLevels, Media],
  globals: [SiteSettings],
```

- [ ] **Step 6: Regenerate, run and see it pass**

```bash
npm run generate:types && npm run generate:importmap
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/int/pages-and-settings.int.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
npx prettier --write src tests
npm run lint && npm run typecheck
git add src/collections/Pages.ts src/globals/SiteSettings.ts src/payload.config.ts src/payload-types.ts "src/app/(payload)/admin/importMap.js" tests/int/pages-and-settings.int.spec.ts
git commit -m "feat: pages with drafts, and site settings that feature published articles only"
```

### Task 16: Migrations

**Files:**
- Create: `src/migrations/<timestamp>_stage_2_content.ts` and `.json` (generated), `src/migrations/<timestamp>_starting_data.ts` (generated, then filled in)
- Modify: `src/migrations/index.ts` (generated)
- Test: `tests/int/starting-data.int.spec.ts`

- [ ] **Step 1: Generate the schema migration against a scratch database** that development-mode push has never touched:

```bash
docker compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS sagevani_migrate_check" -c "CREATE DATABASE sagevani_migrate_check"
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/sagevani_migrate_check \
  npm run payload -- migrate:create stage_2_content
grep -c "CREATE TABLE" src/migrations/*_stage_2_content.ts
grep -n '"prefix"' src/migrations/*_stage_2_content.ts
```

Expected: `Migration created at …_stage_2_content.ts`. The new tables are created (the count is at least 10), and `media` has a `"prefix" varchar DEFAULT ''` column. The schema already exists by now, so there's no `CREATE SCHEMA` to add.

- [ ] **Step 2: Create a blank migration for the starting data**

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/sagevani_migrate_check \
  npm run payload -- migrate:create starting_data --force-accept-warning
tail -6 src/migrations/index.ts
```

Expected: `Migration created at …_starting_data.ts`, listed last in `index.ts`.

- [ ] **Step 3: Write the failing test** in `tests/int/starting-data.int.spec.ts`:

```ts
import { createLocalReq, getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { migrations } from '@/migrations'
import config from '@/payload.config'

import { clearContent } from '../helpers/content'

let payload: Payload

const startingData = () => {
  const migration = migrations.find(({ name }) => name.endsWith('_starting_data'))
  if (!migration) throw new Error('No *_starting_data migration in src/migrations/index.ts')
  return migration
}

const runUp = async () => {
  const req = await createLocalReq({}, payload)
  await startingData().up({ db: payload.db.drizzle, payload, req } as never)
}

describe('starting data migration', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearContent(payload)
  })

  afterAll(async () => {
    await clearContent(payload)
    await payload.destroy()
  })

  it('adds the four doors with the charter’s questions, in order', async () => {
    await runUp()
    const { docs } = await payload.find({ collection: 'topics', sort: 'order', overrideAccess: true })
    expect(docs.map(({ name, slug, question, order }) => ({ name, slug, question, order }))).toEqual([
      { name: 'Dharma', slug: 'dharma', question: 'How shall I live?', order: 1 },
      { name: 'Adhyātma', slug: 'adhyatma', question: 'Who am I?', order: 2 },
      {
        name: 'Bhakti',
        slug: 'bhakti',
        question: 'What is the Divine, and what is my relationship to it?',
        order: 3,
      },
      { name: 'Sādhanā', slug: 'sadhana', question: 'How shall I practice what I understand?', order: 4 },
    ])
    expect(docs.map((topic) => topic.coverTint)).toEqual([
      { background: '#e3cfa8', text: '#3d2f1c' },
      { background: '#cfcbc5', text: '#2b2a2c' },
      { background: '#e5c3b4', text: '#4a241a' },
      { background: '#cdd6c2', text: '#28331f' },
    ])
    expect(docs.every((topic) => !topic.intro)).toBe(true)
  })

  it('adds the three proposed levels, with Advanced needing prior reading', async () => {
    await runUp()
    const { docs } = await payload.find({
      collection: 'difficultyLevels',
      sort: 'order',
      overrideAccess: true,
    })
    expect(docs.map(({ name, description, needsPriorReading }) => ({ name, description, needsPriorReading }))).toEqual([
      { name: 'Beginner', description: 'No prior study assumed', needsPriorReading: false },
      {
        name: 'Intermediate',
        description: 'Some familiarity with the relevant terms or text',
        needsPriorReading: false,
      },
      {
        name: 'Advanced',
        description: 'Familiarity with the texts, schools, or interpretive debates involved',
        needsPriorReading: true,
      },
    ])
  })

  it('can run again without duplicating rows or undoing the owner’s edits', async () => {
    await runUp()
    const dharma = (await payload.find({ collection: 'topics', where: { slug: { equals: 'dharma' } }, overrideAccess: true })).docs[0]
    await payload.update({ collection: 'topics', id: dharma.id, data: { intro: 'Owner’s words.' }, overrideAccess: true })

    await runUp()
    expect((await payload.count({ collection: 'topics', overrideAccess: true })).totalDocs).toBe(4)
    expect((await payload.count({ collection: 'difficultyLevels', overrideAccess: true })).totalDocs).toBe(3)
    const again = await payload.findByID({ collection: 'topics', id: dharma.id, overrideAccess: true })
    expect(again.intro).toBe('Owner’s words.')
  })
})
```

- [ ] **Step 4: Run and see it fail**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/int/starting-data.int.spec.ts
```

Expected: FAIL. The blank migration adds nothing.

- [ ] **Step 5: Fill in the migration.** Replace the whole content of `src/migrations/<timestamp>_starting_data.ts` with:

```ts
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

// The four doors and the three proposed difficulty levels, from text the handbook and the website
// spec already fix (stage 2 design, 6). Topic intros are the owner's to write. Rows that exist are
// left alone, so an edit made in the admin survives a re-run. Once this has run anywhere, change
// the data with a new migration, not by editing this one.
const TOPICS = [
  {
    name: 'Dharma',
    slug: 'dharma',
    question: 'How shall I live?',
    order: 1,
    coverTint: { background: '#e3cfa8', text: '#3d2f1c' },
  },
  {
    name: 'Adhyātma',
    slug: 'adhyatma',
    question: 'Who am I?',
    order: 2,
    coverTint: { background: '#cfcbc5', text: '#2b2a2c' },
  },
  {
    name: 'Bhakti',
    slug: 'bhakti',
    question: 'What is the Divine, and what is my relationship to it?',
    order: 3,
    coverTint: { background: '#e5c3b4', text: '#4a241a' },
  },
  {
    name: 'Sādhanā',
    slug: 'sadhana',
    question: 'How shall I practice what I understand?',
    order: 4,
    coverTint: { background: '#cdd6c2', text: '#28331f' },
  },
]

// The proposed labels and criteria in docs/editorial/reader-guidance.md, awaiting Q-01.
const LEVELS = [
  { name: 'Beginner', description: 'No prior study assumed', order: 1, needsPriorReading: false },
  {
    name: 'Intermediate',
    description: 'Some familiarity with the relevant terms or text',
    order: 2,
    needsPriorReading: false,
  },
  {
    name: 'Advanced',
    description: 'Familiarity with the texts, schools, or interpretive debates involved',
    order: 3,
    needsPriorReading: true,
  },
]

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  for (const topic of TOPICS) {
    const { totalDocs } = await payload.count({
      collection: 'topics',
      where: { slug: { equals: topic.slug } },
      req,
    })
    if (totalDocs === 0) await payload.create({ collection: 'topics', data: topic, req })
  }
  for (const level of LEVELS) {
    const { totalDocs } = await payload.count({
      collection: 'difficultyLevels',
      where: { name: { equals: level.name } },
      req,
    })
    if (totalDocs === 0) await payload.create({ collection: 'difficultyLevels', data: level, req })
  }
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.delete({
    collection: 'topics',
    where: { slug: { in: TOPICS.map((topic) => topic.slug) } },
    req,
  })
  await payload.delete({
    collection: 'difficultyLevels',
    where: { name: { in: LEVELS.map((level) => level.name) } },
    req,
  })
}
```

- [ ] **Step 6: Run and see it pass**

```bash
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/int/starting-data.int.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Migrate a fresh database, as a production deploy does**

```bash
docker compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS sagevani_stage2_check" -c "CREATE DATABASE sagevani_stage2_check"
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/sagevani_stage2_check npm run deploy:migrate
docker compose exec -T db psql -U postgres -d sagevani_stage2_check -tAc \
  "select name from payload.payload_migrations order by id; select count(*) from payload.topics; select count(*) from payload.difficulty_levels; select relrowsecurity from pg_class where oid = 'payload.articles'::regclass;"
docker compose exec -T db psql -U postgres -c "DROP DATABASE sagevani_stage2_check" -c "DROP DATABASE sagevani_migrate_check"
```

Expected:
- three migrations are listed: initial, stage 2 content and starting data;
- the counts are `4` topics and `3` levels;
- `t`, meaning the hardening step turned row-level security on for the new tables.

- [ ] **Step 8: Commit**

```bash
npx prettier --write src tests
npm run lint && npm run typecheck
git add src/migrations tests/int/starting-data.int.spec.ts
git commit -m "feat: migrations for the content collections and their starting data"
```

### Task 17: The browser test

**Files:**
- Create: `tests/e2e/database.ts`, `tests/e2e/owner.ts`, `tests/e2e/reset-database.ts`, `tests/e2e/global-setup.ts`, `tests/e2e/publish-article.e2e.spec.ts`
- Modify: `playwright.config.ts`

The test writes to a database, so it runs against the test database on its own port (3100). It never touches the local dev database or a dev server on port 3000.

- [ ] **Step 1: Create** `tests/e2e/database.ts`:

```ts
import { assertTestDatabase } from '../helpers/test-database'

/**
 * The browser tests' database: CI's DATABASE_URL, or the local test database. The tests empty it,
 * so anything whose name doesn't end in "_test" is refused.
 */
export const E2E_DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:54329/sagevani_test'

assertTestDatabase(E2E_DATABASE_URL)
```

- [ ] **Step 2: Create** `tests/e2e/owner.ts`:

```ts
/** The owner account the browser tests sign in with. Test-only; reset-database.ts creates it. */
export const E2E_OWNER = {
  email: 'e2e-owner@example.com',
  name: 'E2E Owner',
  password: 'e2e-only-password-not-a-secret',
}
```

- [ ] **Step 3: Create** `tests/e2e/reset-database.ts`:

```ts
// Run by global-setup.ts before the browser tests. It empties the test database, then creates the
// owner and the one difficulty level the tests use. It refuses any database whose name does not
// end in "_test".
import 'dotenv/config'
import { getPayload } from 'payload'

import { assertTestDatabase } from '../helpers/test-database'
import { E2E_OWNER } from './owner'

assertTestDatabase(process.env.DATABASE_URL)

const { default: config } = await import('../../src/payload.config')
const { allowOwnerChange } = await import('../../src/collections/Users')
const payload = await getPayload({ config })

for (const collection of ['articles', 'pages', 'media', 'topics', 'difficultyLevels'] as const) {
  await payload.delete({ collection, where: { id: { exists: true } }, overrideAccess: true })
}
await payload.delete({
  collection: 'users',
  where: { id: { exists: true } },
  overrideAccess: true,
  context: allowOwnerChange(),
})
await payload.create({
  collection: 'users',
  data: { ...E2E_OWNER, role: 'owner' },
  overrideAccess: true,
  context: allowOwnerChange(),
})
await payload.create({
  collection: 'difficultyLevels',
  data: { name: 'Advanced', order: 3, needsPriorReading: true },
  overrideAccess: true,
})

await payload.destroy()
// Payload keeps background handles open after destroy(); exit explicitly so setup can continue.
process.exit(0)
```

- [ ] **Step 4: Create** `tests/e2e/global-setup.ts`:

```ts
import { execFileSync } from 'child_process'
import path from 'path'

import { E2E_DATABASE_URL } from './database'

/** Resets the test database through tsx, which loads Payload the way the app's scripts do. */
export default function globalSetup(): void {
  execFileSync(
    process.execPath,
    [path.resolve('node_modules/tsx/dist/cli.mjs'), 'tests/e2e/reset-database.ts'],
    {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL, NODE_OPTIONS: '--no-deprecation' },
    },
  )
}
```

- [ ] **Step 5: Point Playwright at the test database.** Replace the whole of `playwright.config.ts` with:

```ts
import { defineConfig, devices } from '@playwright/test'

import { E2E_DATABASE_URL } from './tests/e2e/database'

// Its own port, so a dev server on 3000 with the dev database is never reused by mistake.
const PORT = 3100
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  // Playwright starts webServer first, then this. Both use the test database.
  globalSetup: './tests/e2e/global-setup.ts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    navigationTimeout: 45_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Merged over process.env. Next doesn't override a variable that is already set with .env.
    env: { DATABASE_URL: E2E_DATABASE_URL },
  },
})
```

- [ ] **Step 6: Write the test** `tests/e2e/publish-article.e2e.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import sharp from 'sharp'

import { E2E_OWNER } from './owner'

const ADVANCED_NEEDS_READING = 'This difficulty level needs at least one suggested prior reading.'

test('the owner writes an article, the publish rules stop it, and it publishes once fixed', async ({
  page,
}, testInfo) => {
  // The first visit to the admin compiles it, which is slow on a cold CI runner.
  test.setTimeout(180_000)
  const imagePath = testInfo.outputPath('vermilion.png')
  await sharp({ create: { width: 640, height: 400, channels: 3, background: '#9a3b26' } })
    .png()
    .toFile(imagePath)

  await page.goto('/admin/login')
  await page.locator('input[name="email"]').fill(E2E_OWNER.email)
  await page.locator('input[name="password"]').fill(E2E_OWNER.password)
  await page.getByRole('button', { name: 'Login' }).click()
  await expect(page).toHaveURL(/\/admin\/?$/)

  // With autosave on, opening "create" saves a draft at once and moves to its edit page.
  await page.goto('/admin/collections/articles/create')
  await expect(page).toHaveURL(/\/admin\/collections\/articles\/\d+$/)

  await page.getByRole('textbox', { name: 'Title *' }).fill('Karma and the right to act')
  await page.locator('#field-shape').click()
  await page.getByRole('option', { name: 'Inquiry Essay' }).click()
  await page.locator('#field-difficulty').click()
  await page.getByRole('option', { name: 'Advanced' }).click()

  const editor = page.locator('[data-lexical-editor="true"]')
  await editor.click()
  await page.keyboard.type('What does it mean to act without claiming the fruit?')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/')
  await page.getByRole('option', { name: 'Verse' }).click()
  await page.locator('#field-transliteration').fill('karmaṇy evādhikāras te mā phaleṣu kadācana')
  await page.locator('#field-translation').fill('Your right is to the action alone, never to its fruits.')
  await page.locator('#field-textName').fill('Bhagavad Gītā')
  await page.locator('#field-location').fill('2.47')
  await page.locator('#field-translator').fill('Test translation')

  await editor.locator('p').last().click()
  await page.keyboard.type('/')
  await page.getByRole('option', { name: 'Upload' }).click()
  await page.getByRole('button', { name: 'Add new Media' }).click()
  const drawer = page.getByRole('dialog').last()
  await drawer.locator('input[type="file"]').setInputFiles(imagePath)
  await drawer.locator('#field-alt').fill('A vermilion square')
  await drawer.locator('#field-creator').fill('Sagevani')
  await drawer.locator('#field-source').fill('Made for this test')
  await drawer.locator('#field-licence').fill('Own work')
  await drawer.getByRole('button', { name: 'Save' }).click()
  await expect(editor.getByRole('button', { name: 'Edit Media' })).toBeVisible()

  await page.getByRole('button', { name: 'Publish changes' }).click()
  await expect(page.getByText(ADVANCED_NEEDS_READING).first()).toBeVisible()
  await expect(page.getByText(/Status:\s*Draft/).first()).toBeVisible()

  await page.getByRole('button', { name: 'Add Prior reading' }).click()
  await page.locator('input[name="readFirst.0.title"]').fill('Bhagavad Gītā, chapter 2')
  await page.getByRole('button', { name: 'Publish changes' }).click()
  await expect(page.getByText(/Status:\s*Published/).first()).toBeVisible()
  await expect(page.locator('#field-approval__versionId')).not.toHaveValue('')
})
```

- [ ] **Step 7: Run the browser tests**

```bash
npm run test:e2e
```

Expected: 4 passed, the three smoke tests and this one. The smoke test `admin asks for an email…` now lands on `/admin/login`, because the reset creates the owner; its pattern already allows that.

If a selector times out, open the trace (`npx playwright show-trace test-results/…/trace.zip`). Compare it with the selectors in "Before you start", item 8, before changing the test.

- [ ] **Step 8: Commit**

```bash
npx prettier --write tests playwright.config.ts
npm run lint && npm run typecheck
git add tests/e2e playwright.config.ts
git commit -m "test: the owner publishes an article in the admin, past the publish rules"
```

### Task 18: Documents

**Files:**
- Modify: `website/.env.example`, `website/docs/environments.md`, `website/docs/specs/2026-10-08-stage-2-content-model-design.md`, `website/docs/specs/2026-10-05-sagevani-website-design.md`, `CHANGELOG.md` (root), `docs/operations/tasks.md` (root)

- [ ] **Step 1: `.env.example`.** Append:

```dotenv

# Media storage (Supabase Storage). Leave all empty locally: uploads then go to website/uploads/.
# Required for any database that is not local; set all six or none.
MEDIA_S3_ENDPOINT=
MEDIA_S3_REGION=
MEDIA_S3_ACCESS_KEY_ID=
MEDIA_S3_SECRET_ACCESS_KEY=
MEDIA_S3_BUCKET=
MEDIA_PUBLIC_URL=
```

- [ ] **Step 2: `docs/environments.md`, variables.** In the `## Variables` table, add these rows after `DATABASE_MIGRATION_URL`:

```markdown
| `MEDIA_S3_ENDPOINT` | The app | The project's Storage S3 endpoint, from **Storage → S3 Configuration**, e.g. `https://<ref>.storage.supabase.co/storage/v1/s3`. Not set locally |
| `MEDIA_S3_REGION` | The app | The region shown next to the endpoint, e.g. `us-east-2` |
| `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY` | The app | An S3 access key pair created on the same page |
| `MEDIA_S3_BUCKET` | The app | `media` |
| `MEDIA_PUBLIC_URL` | The app | `https://<ref>.supabase.co/storage/v1/object/public/media` |
```

and add to `Rules for these values:`:

```markdown
- **Set all six media variables or none.** Locally, leave them empty and uploads go to `website/uploads/`. For a database that isn't local they're required, because Netlify's functions have no lasting disk.
```

- [ ] **Step 3: `docs/environments.md`, owner setup.** At the end of `### 1. Create the Supabase projects`, add:

```markdown
- For each project, create the media bucket:
  - **Storage → New bucket**, named `media`, with **Public bucket** on. Images load straight from it.
  - Leave the bucket's policies empty. Anonymous visitors can then fetch a file by its address but can't list the bucket, so an image used only in a draft stays out of sight.
  - **Storage → S3 Configuration**: note the endpoint and region, and create an access key pair. Keep the secret like a password.
```

In `### 4. Connect Netlify`, add these rows to the variables table:

```markdown
   | `MEDIA_S3_ENDPOINT`, `MEDIA_S3_REGION` | Production project's values | Staging project's values |
   | `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY` | Production key pair | Staging key pair |
   | `MEDIA_S3_BUCKET` | `media` | `media` |
   | `MEDIA_PUBLIC_URL` | Production bucket's public address | Staging bucket's public address |
```

and change the "Tick **Contains secret values**" bullet's list to `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `PAYLOAD_SECRET` and `MEDIA_S3_SECRET_ACCESS_KEY`.

In `## Run locally`, replace item 4 with:

```markdown
4. Run the tests with `npm test`, coverage with `npm run test:coverage`, and the browser tests with `npm run test:e2e`. The browser tests start their own server on port 3100 against the test database and empty it first, so they never touch your dev database.
```

- [ ] **Step 4: Link the plan from the specs.** In `docs/specs/2026-10-08-stage-2-content-model-design.md`, replace:

```markdown
- Implementation plan: to be written in `../plans/` once this spec is approved
```

with:

```markdown
- Implementation plan: [stage 2 — content model and admin](../plans/2026-10-08-stage-2-content-model.md)
```

In `docs/specs/2026-10-05-sagevani-website-design.md`, replace:

```markdown
- Implementation plans: [stage 1 — foundation](../plans/2026-10-05-stage-1-foundation.md)
```

with:

```markdown
- Implementation plans: [stage 1 — foundation](../plans/2026-10-05-stage-1-foundation.md), [stage 2 — content model and admin](../plans/2026-10-08-stage-2-content-model.md)
```

- [ ] **Step 5: `CHANGELOG.md` (repository root).** Add at the top, under `# Change log`:

```markdown
## 2026-10-08 — Website stage 2: content model and admin

- Added the content collections: articles, pages, topics, difficulty levels and media, plus site settings. The editor has Verse, Tradition and Practice blocks and images.
- Publishing is the owner's approval. It records the approver, the time and the approved version. A difficulty level is required, a level marked "needs prior reading" requires a prior reading, a Text / Story Study requires a source, and every image needs alt text.
- The assistant saves drafts only, through its API key. Publishing, unpublishing, restoring versions, duplicating and deleting are refused.
- Images go to Supabase Storage under random names. The media API is staff-only. Uploads are re-encoded, capped at 2,400 pixels and stripped of metadata such as GPS location.
- A migration adds the four topics with the charter's questions and the three proposed difficulty levels.
- Nothing public is built yet.
```

- [ ] **Step 6: `docs/operations/tasks.md` (repository root).** Replace:

```markdown
- [ ] Owner: create the Supabase projects and connect Netlify. See the [environments guide](../../website/docs/environments.md).
- [ ] Plan website stage 2 (content model and admin).
```

with:

```markdown
- [ ] Owner: create the Supabase projects, their `media` buckets and S3 keys, and connect Netlify. See the [environments guide](../../website/docs/environments.md).
- [x] Plan website stage 2 (content model and admin): [design](../../website/docs/specs/2026-10-08-stage-2-content-model-design.md), [plan](../../website/docs/plans/2026-10-08-stage-2-content-model.md).
- [ ] Build website stage 2 (pull request open as a draft).
- [x] Move JapaDhyan's domain logic and catalog into the website (part 1 of D-006), merged on 2026-10-08.
- [ ] Owner: archive the old JapaDhyan repository once its pull request #26 is merged.
```

- [ ] **Step 7: Commit**

```bash
cd ..
git add website/.env.example website/docs CHANGELOG.md docs/operations/tasks.md
git commit -m "docs: stage 2 setup steps, variables, changelog and task list"
cd website
```

### Task 19: Full verification and the draft pull request

- [ ] **Step 1: Everything CI runs**

```bash
npm run lint && npm run format:check && npm run typecheck && npm run test:coverage && npm run test:e2e
```

Expected:
- every command passes;
- coverage stays at or above 80% for lines, functions, branches and statements;
- the browser tests report 4 passed.

- [ ] **Step 2: The deploy path on a fresh database.** Use the same commands as Task 16, Step 7. Expected: three migrations, 4 topics and 3 levels.

- [ ] **Step 3: Push and open the draft pull request** (from the repository root):

```bash
git push -u origin feat/website-stage-2
gh pr create --draft --base master --head feat/website-stage-2 \
  --title "Website stage 2: content model and admin" \
  --body-file - <<'EOF'
## What

Stage 2 of the website ([design](website/docs/specs/2026-10-08-stage-2-content-model-design.md), [plan](website/docs/plans/2026-10-08-stage-2-content-model.md)).

- Content collections: articles, pages, topics, difficulty levels, media, and the site settings.
- Verse, Tradition and Practice blocks and images in the editor.
- Publishing records the approval and must pass the publish rules.
- The assistant saves drafts only; publishing, unpublishing, restoring, duplicating and deleting are refused.
- Images in Supabase Storage under random names, with a staff-only media API, re-encoded and stripped of metadata.
- A migration adds the four topics and the three proposed levels.

Nothing public is built yet.

## Owner setup before the preview works

Create the `media` bucket and S3 keys in both Supabase projects, and add the six `MEDIA_*` variables to Netlify ([environments guide](website/docs/environments.md)). Apply the two new migrations to staging from your machine.

## Checks

- [x] `npm run lint`, `format:check`, `typecheck` and `test:coverage` pass locally
- [x] `npm run test:e2e`: the owner publishes an article in the admin, past the publish rules
- [x] A fresh database migrates and hardens with the deploy command
- [ ] CI passes

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

Expected: a draft pull request URL. Don't request a Copilot review; the owner does that.

---

## Notes for stage 3

- **Local images on public pages.** With storage off, media files are served through Payload's file route, which applies the staff-only `read` access. Local public pages will therefore need a development-only way to show images, or a local S3 server. Hosted sites are unaffected: files load from the bucket.
- **Draft preview** reads the latest draft with `draft: true` through the local API, for staff only.
- **Refreshing pages on publish** hooks into `afterChange` next to `recordApprovedVersion`.

## Self-review against the spec

| Spec section | Task |
| --- | --- |
| 3.1 articles: drafts, fields, slug, reading time, search text, server-set fields, checklist, blocks | 7, 12, 13, 14 |
| 3.2 topics | 11 |
| 3.3 difficultyLevels | 11 |
| 3.4 pages with drafts | 15 |
| 3.5 media fields | 10 |
| 3.6 siteSettings | 15 |
| 4.1 access table | 2, 10, 11, 12, 15 |
| 4.2 drafts-only guard, every refused case through REST | 12 |
| 4.3 publish rules, approval, unpublishing | 6, 12, 14 |
| 5 media storage: settings rule, random names, types, size, re-encoding, hidden list | 8, 10 |
| 6 starting data | 16 |
| 7 database, hardening | 16 |
| 8 testing: unit, integration, end-to-end | 2–17 |
| 10 documents | 18 |
