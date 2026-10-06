# JapaDhyan move into SageVani — Implementation Plan (part 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** JapaDhyan's documents, catalog, content build and pure domain logic live in this repository under `website/`, cleaned of everything native and PowerSync, and the old JapaDhyan repository points here and is archived.

**Architecture:** Files are copied from the JapaDhyan repository, not imported with history. Two pull requests, both stacked on stage 1's branch and opened against `main` once stage 1 merges:

- **Docs:** `website/docs/japa/`, D-006 and the workspace documents.
- **Code:** `website/src/japa/domain`, `website/src/japa/catalog-build`, `website/japa-catalog/`, two scripts and their tests.

Nothing is wired into the site or its deploys.

**Tech Stack:** TypeScript 5.7, Zod 4.6.5, `@noble/hashes` 2.4.0, `yaml` 2.9.1, `@siva-sh/vidyut` 0.3.0 (WebAssembly), Vitest 4, ESLint 9 (Next flat config), tsx, Git Bash.

**Spec:** [`../specs/2026-10-06-japadhyan-in-sagevani-design.md`](../specs/2026-10-06-japadhyan-in-sagevani-design.md).

---

## Before you start

- **Two repositories.** Every code block sets the paths it needs:
  - `SRC=/c/Users/shash/Documents/personal-github-repos/japadhyan`: the JapaDhyan repository. Read from it; change it only in Phase C.
  - `DEST=/c/Users/shash/Documents/personal-github-repos/Sagevani-japa`: a git worktree of this repository on branch `docs/japadhyan-move`, stacked on `feat/website-foundation` (stage 1).
  - **Never touch** `/c/Users/shash/Documents/personal-github-repos/Sagevani`, the main checkout. It holds the owner's uncommitted stage 1 work.
- **Shell.** Git Bash. Shell state doesn't carry between steps, so each block sets its own variables.
- **A hook false positive.** A global hook blocks any command that contains `git commit` together with a `-n`-style flag, such as `grep -n`. Keep `git commit` in a command of its own.
- **Commits in this repository** use the conventional format (`docs:`, `feat:`, `refactor:`, `test:`, `chore:`) and **no attribution trailer**. Commits in the JapaDhyan repository (Phase C) end with its usual `Co-Authored-By` trailer.
- **Markdown keeps hand formatting here.** `website/.prettierignore` skips `docs/` and `*.md`. Don't run Prettier on Markdown in this repository, and don't align tables.
- **Owner-only steps** are marked **[OWNER]**. Deleting hosted services, archiving a repository and merging are the owner's. Do not perform them without the owner's explicit go-ahead in the conversation.
- **Stage 1 must merge before any pull request opens.** Do Phases A and B now, and stop at the "open the pull request" steps until stage 1 (`shashesh/sagevani` pull request #1) is merged.

## File map

| Path (in this repository) | Responsibility |
| --- | --- |
| `website/docs/japa/**` | JapaDhyan's product, architecture and decision documents, with their own `README.md` index |
| `docs/governance/decisions.md` | D-006 |
| `docs/governance/open-questions.md` | Q-11 (sign-in), Q-12 (reminders) |
| `docs/project-brief.md`, `README.md`, `AGENTS.md`, `CHANGELOG.md` | Workspace records that mention JapaDhyan |
| `website/docs/specs/2026-10-05-sagevani-website-design.md` | Section 19: the `/japa` rules that bind the rest of the site |
| `website/src/japa/domain/**` | Types, Zod schemas and pure logic (was `packages/shared/src`) |
| `website/src/japa/catalog-build/**` | The content build's library (was `tools/content-build/src`) |
| `website/scripts/japa-content-validate.ts`, `website/scripts/japa-content-build.ts` | The content build's two commands |
| `website/japa-catalog/content/**`, `website/japa-catalog/snapshot/**` | The catalog YAML and the reviewed snapshot |
| `website/tests/unit/japa/**` | The moved tests, as `*.unit.spec.ts` |
| `website/eslint.config.mjs` | The purity rule for `src/japa/domain` |
| `website/vitest.config.mts` | Coverage takes in `src/japa/**` |
| `website/package.json`, `website/package-lock.json` | Three dependencies and two scripts |
| `website/.gitignore`, `website/.prettierignore` | Ignore the built packs; leave the catalog unformatted |

---

## Phase A — Docs pull request (branch `docs/japadhyan-move`)

### Task 1: Copy the documents that carry across

**Files:**
- Create: `website/docs/japa/{product,product/features,architecture,decisions,research}/*.md` (34 files)

- [ ] **Step 1: Copy them unchanged**

```bash
SRC=/c/Users/shash/Documents/personal-github-repos/japadhyan
J=/c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website/docs/japa
mkdir -p "$J/product/features" "$J/architecture" "$J/decisions" "$J/research"
cp "$SRC"/docs/product/{vision,roadmap,glossary,open-questions}.md "$J/product/"
for f in accounts-and-sync age-modes-and-accessibility chanting-modes community content-and-learning \
  dedication-and-offering dharmic-traditions festival-programs mantra-library onboarding \
  partners-and-revenue sankalpa-and-progress session-experience; do
  cp "$SRC/docs/product/features/$f.md" "$J/product/features/"
done
cp "$SRC"/docs/architecture/{platform-principles,data-model,content-pipeline}.md "$J/architecture/"
for f in 2026-09-21-collective-not-competitive 2026-09-21-devotee-first 2026-09-21-dharmic-traditions-scope \
  2026-09-21-free-flow-nothing-locked 2026-09-21-full-scope-in-phases 2026-09-21-open-audience \
  2026-09-22-content-packs 2026-09-22-grouped-count-events 2026-09-22-guest-first-accounts \
  2026-09-22-position-deletion-barrier 2026-09-22-practice-model-ordered-steps \
  2026-09-23-schema-library-zod 2026-09-23-transliteration-library; do
  cp "$SRC/docs/decisions/$f.md" "$J/decisions/"
done
cp "$SRC/docs/research/inspiration-sai-nama-japam.md" "$J/research/"
find "$J" -name '*.md' | wc -l
```

Expected: `34`. Not copied, on purpose:
- the tech-stack, PowerSync, CI-only-when-ready and app-name decisions
- both plans, the archived plan, the setup guide, `monorepo-structure.md` and `store-listing.md`
- `wearables-and-hardware.md`
- `docs/INDEX.md` and `docs/README.md`

- [ ] **Step 2: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/docs/japa
git commit -m "docs: copy JapaDhyan's product, architecture and decision documents unchanged"
```

The next commits adapt them, so each change is reviewable as a diff against the original.

### Task 2: Rewrite the platform principles for the web

**Files:**
- Modify: `website/docs/japa/architecture/platform-principles.md` (whole file)

- [ ] **Step 1: Replace the file's content with exactly this**

````markdown
---
status: active
updated: 2026-10-06
---

# Platform principles

JapaDhyan is a section of the SageVani website at `/japa`, used in desktop and mobile browsers ([D-006](../../../../docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa)). It is part of the website's Next.js app and deploys with it. There are no iOS, Android or watch apps.

## Targets

- Current Chrome, Edge, Firefox and Safari, on computers and phones.
- `/japa` can be added to the home screen and opened like an app. Its service worker covers `/japa` only, not the blog.
- What a browser can't do is not part of JapaDhyan: volume-button counting, flip face down to pause, watch apps, and Bluetooth rings (Web Bluetooth is missing from Safari and Firefox).
- Vibration works only in Android browsers, so every vibration cue also has a visual cue, plus an optional sound where it matters, such as the meru bead.
- The screen stays on during a session through the Screen Wake Lock API.

## Offline-first

- Counting, the library, sankalpas and charts work with **no connection** after the first visit to `/japa`.
- Counts are written in the browser first and synced later. Sync must never lose or double-count repetitions: count events are append-only per device and merged on the server. Events are grouped and sealed, never edited ([decision](../decisions/2026-09-22-grouped-count-events.md)).
- On the first visit, the service worker caches the `/japa` pages and the core content pack. The rest of the library downloads as packs ([content-pipeline](content-pipeline.md)).
- Browsers can clear stored data, so `/japa` asks the browser to keep it (`navigator.storage.persist()`) and offers backup early ([accounts-and-sync](../product/features/accounts-and-sync.md#web)).
- Which browser storage to use, and how offline pages are cached, are proved in part 2 (the offline spike) and settled in part 3 ([the four parts](../../specs/2026-10-06-japadhyan-in-sagevani-design.md#3-the-four-parts)).

## Accounts and sync

- **No account required**, ever ([decision](../decisions/2026-09-22-guest-first-accounts.md)).
- An optional account syncs across devices and backs up history, after explicit consent. Export and import for everyone. Sync is our own code against Supabase, designed in part 3. See [accounts-and-sync](../product/features/accounts-and-sync.md).

## Privacy

- **Voice:** audio is processed on the device only, never uploaded, not stored after the session.
- **Private guru mantras:** words never stored; only the devotee's chosen label and counts.
- **Minimal analytics**, opt-in, never including mantra text, dedications, sankalpa intentions or reflections. The blog's Google Analytics never records a `/japa` page.
- Community features (P3) are opt-in and anonymous by default.
- **Religion is sensitive data.** Which deities and mantras someone chants is special-category data under GDPR Article 9, so nothing syncs without explicit consent ([accounts-and-sync](../product/features/accounts-and-sync.md#consent-before-the-first-sync-p1)).

## Data model notes

- Core entities: `Tradition`, `Deity`, `Practice` (an ordered list of steps: mantra, namavali, stotra), `SavedPractice`, `Session`, `CountEvent`, `Sankalpa`, `Program`; later `Dedication` (P2) and `Group` (P3). Full model: [data-model](data-model.md).
- Nothing Hindu-specific hard-coded — see [dharmic-traditions](../product/features/dharmic-traditions.md).
- Multilingual UI and content; multiple calendar systems.
````

- [ ] **Step 2: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/docs/japa/architecture/platform-principles.md
git commit -m "docs(japa): platform principles for a browser-only section of the website"
```

### Task 3: Data model — keep the rules, drop PowerSync

**Files:**
- Modify: `website/docs/japa/architecture/data-model.md`

- [ ] **Step 1: Set the front matter's `updated:` to `2026-10-06`**

- [ ] **Step 2: Small replacements.** Each "find" text occurs once. Replace it exactly:

| Find | Replace with |
| --- | --- |
| `a UUIDv7 generated at first launch` | `a UUIDv7 generated on the first visit` |
| `From the phone's setting at first launch` | `From the browser's language at the first visit` |
| `(tap, volume button, or chant along in P2)` | `(tap, or chant along in P2)` |
| `Notifications are scheduled per device.` | `Browsers can't schedule notifications, so reminders need web push from a server; part 3 designs them, and what the server may know.` |
| `PowerSync's demo connector goes further and discards the row, losing its marks silently. Ours sets it aside on the device instead, in a local-only table a later fix can replay ([S4 plan](../plans/active/2026-09-24-s4-sync-prototype.md#the-client)), but the row still never reaches the server.` | `Some sync engines go further and discard the row, losing its marks silently.` |

Then delete the whole line `- **Device settings:** volume-button counting, flip to pause.`.

- [ ] **Step 3: Replace everything from the line `### Layers` up to, not including, `### Tables by behaviour` with:**

````markdown
### Layers

```text
/japa screens and hooks (part 4)
   │
repositories (part 3): the only code that touches browser storage
   │
Browser storage  ── our own sync (part 3) ──  Supabase Postgres

src/japa/domain   pure logic: totals, streaks, local_day, event sealing,
                  combine rules, content and export schemas (all tested)
```

````

- [ ] **Step 4: Replace everything from `### How values are stored` up to, not including, `### Ids for rows that are unique per devotee` with:**

```markdown
### How values are stored

The [conflict rule](#conflict-rule) and the [position merge](#practiceposition) need some values in a form that the browser and Postgres compare the same way. These are requirements for part 3's storage and wire format:

- **`hlc`** is one fixed-width text value: `<millis, 15 digits>:<counter, 10 digits>:<device_id>`, e.g. `001727190000000:0000000003:device-a`. Its byte order is exactly the conflict rule's order, so a plain `>` compares it. `device_id` is limited to 64 lowercase letters, digits and hyphens, and Postgres declares the column `collate "C"`: other collations skip punctuation and would order it wrongly. `deleted_hlc` is stored the same way. The codec is `hlcText.ts` in `src/japa/domain`.
- **`chanted_steps`** is lowercase hex, two characters a byte: 28 characters for 108 names (`marks.ts`).
- **Reading a record validates it**, because a record comes from storage or the network and is never trusted. It also enforces the server's limits, so the browser never writes a record the server would refuse or drop:
  - lengths: practice ids 128 characters, device ids 64, marks 512 bytes
  - a count that is positive, except a correction's, which is never 0
  - a position's `deleted_hlc` and `deleted_at` set together or not at all
  - a position's `practice_id` as a catalog slug or a lowercase UUID
- The PowerSync-era codecs that did this (`rows.ts`) stay in the [archived repository](https://github.com/shashesh/japadhyan/blob/master/packages/shared/src/logic/rows.ts). Part 3 writes their replacement.

```

- [ ] **Step 5: Replace everything from `### Sync engine` up to, not including, `## Changes to existing code` with:**

```markdown
### Sync engine

Our own, written against Supabase and designed in part 3 ([D-006](../../../../docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa)). PowerSync was chosen first and dropped with the native apps; that decision and its prototype are in the [archived repository](https://github.com/shashesh/japadhyan/blob/master/docs/decisions/2026-09-22-sync-engine-powersync.md). Part 3 must show:

1. A guest's data becomes account data following the [combine rules](../product/features/accounts-and-sync.md#signing-in-on-a-device-that-already-has-data).
2. Two devices go offline, both keep chanting, reconnect, and totals are exact.
3. Local queries update the screen live as counts change.
4. The [conflict rule](#conflict-rule) is applied on the server (a write that applies only if newer, and the position merge for positions), not by the order uploads arrive in.
5. Downloads never skip a change. A cursor built from timestamps can permanently miss a transaction that commits after the cursor has read past its time, and `hlc` can't drive the cursor because devices stamp it. This is the hardest part, and the reason PowerSync was chosen first.

### Web

- **Storage** is the browser's, chosen in part 3: IndexedDB, or SQLite compiled to WebAssembly. If the choice needs cross-origin isolation headers, they apply to `/japa` only, and sign-in on `/japa` uses redirects, because those headers cut popups off from the page that opened them.
- A **service worker** scoped to `/japa` caches its pages and the core content pack, so `/japa` opens offline after the first visit. Part 2 proves this inside the website's Next.js app on Netlify, Safari included.
- `/japa` asks the browser to keep its data (`navigator.storage.persist()`).
- JapaDhyan's articles are SageVani articles: rendered on the server, cached, and found by search engines like any other.

### Server (Supabase)

Requirements for part 3. The [first version](https://github.com/shashesh/japadhyan/tree/master/supabase) of this schema, with its pgTAP tests, is in the archived repository.

- JapaDhyan's tables live in their own `japa` schema in the website's Supabase project, apart from Payload's `payload` schema.
- Tables mirror the shared types, in snake_case.
- Every user table has `user_id` referencing the user **with cascade delete**, so deleting the user deletes everything they own.
- Each devotee reads and writes only their own rows, on every path data takes, uploads and downloads alike.
- **Links stay within one user:** `count_events (user_id, session_id)` references `sessions (user_id, id)`, so an event can't point at another user's session. The key also carries `practice_id`, `local_day` and `steps_per_repetition`, so an event can't differ from its session in any of the three ([session](#session)).
- **A count event holds a real count:** `mode` is one of the `ChantMode` values, and `count` is positive, except a correction's, which may be negative but never 0.
- Sessions are inserted once. The only update is filling in an empty `ended_at`. Count events are never updated or deleted, except by deleting the account.
- `practice_id` is not a foreign key: it can be a catalog slug, and the catalog isn't in the database.
- `consents`: user, policy version, date agreed.
- Deleting an account deletes the user, which removes their data and revokes their sessions. `/japa` checks the account each time it comes online; a deleted account fails that check and starts the [clear-device flow](../product/features/accounts-and-sync.md#deleting-an-account-p1).
- Content packs are static files, not database tables.
- **Closed by default.** Nothing in the `japa` schema is reachable through Supabase's web API unless a migration grants it.
- **Every text field has a length limit** (practice ids 128 characters, device ids 64, marks 512 bytes, which is 4,096 names), so no row can be made expensive to store or merge.
- **Positions are written only through a merge** that runs the [position merge](#practiceposition) on the server.
  - It refuses rows the caller doesn't own.
  - It drops a malformed row, a non-canonical `practice_id`, an id not derived from the owner and practice, or a clock more than 5 minutes ahead, and answers success, so the upload queue moves on.
  - With no catalog, the server can't check marks against the step count. So within one generation it ORs them whatever their lengths, padding the shorter with zeros.
- **The server's time** is available to signed-in users, so a device can correct its clock offset before uploading ([conflict rule](#conflict-rule)).

```

- [ ] **Step 6: Check nothing PowerSync-specific is left**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website/docs/japa/architecture
grep -i -E "powersync|op-sqlite|wa-sqlite|expo|volume" data-model.md
```

Expected: only lines in "Sync engine" and "How values are stored" saying PowerSync was dropped, and the archived-repository links.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/docs/japa/architecture/data-model.md
git commit -m "docs(japa): the data model keeps its rules and leaves the sync engine to part 3"
```

### Task 4: Content pipeline — no signing, no sandbox, no app bundle

**Files:**
- Modify: `website/docs/japa/architecture/content-pipeline.md`

- [ ] **Step 1: Set the front matter's `updated:` to `2026-10-06`**

- [ ] **Step 2: Small replacements**

| Find | Replace with |
| --- | --- |
| `built and delivered to devices.` | `built and delivered to browsers.` |
| ``It is not what ships inside the app.`` | ``It is not what browsers download.`` |
| `iOS blocks downloads over 200 MB on mobile data, and many devotees in India and Nepal have phones with little storage.` | `Many devotees in India and Nepal use phones with little storage and costly mobile data, and browsers limit how much a site may store.` |
| ``## Source: `content/` `` (the whole heading line) | `## Source content` |
| `**generated at build time**, not on the phone,` | `**generated at build time**, not in the browser,` |
| `` `npm test` fails when the committed snapshot is out of date`` | `` `npm run test:unit` fails when the committed snapshot is out of date`` |
| `Everything that ships inside the app, in one file:` | ``Everything `/japa` caches on the first visit, in one file:`` |
| `Corrections to bundled content arrive in a new release of this pack` | `Corrections arrive in a new release of this pack` |
| ``Compression happens in transit (HTTP `Content-Encoding`, which the app's networking decodes) and inside the app bundle, so the app needs no decompression library`` | ``Compression happens in transit (HTTP `Content-Encoding`, which the browser decodes), so `/japa` needs no decompression library`` |
| `a CDN can never serve a stale copy under it` | `a cache can never serve a stale copy under it` |
| ``The app remembers the highest it has accepted and rejects a signed manifest with a lower one, so an old but validly signed manifest can't roll a correction back. The bundled `core` ships with its manifest, so a fresh install knows its starting release.`` | `` `/japa` remembers the highest it has accepted and rejects a manifest with a lower one, so a stale cached manifest can't roll a correction back.`` |
| `Whoever runs the CDN can see` | `Whoever hosts the audio can see` |

The heading change keeps the `#source-content` anchor that other documents link to.

- [ ] **Step 3: Replace everything from `## Build` up to, not including, `### The reviewed snapshot` with:**

```markdown
## Build

A script in the website, run from `website/`:

1. **Validate** every file against the schema; check media checksums.
2. **Generate** scripts from the master text.
3. **Build packs:** plain JSON, one file per pack, named by its hash ([packs](#packs)).
4. **Write the manifest:** its schema version, the channel, a `release` number that only goes up, and each pack's id, path, size and SHA-256.
5. **Publish** packs and the manifest as static files served with the website. This is wired into deploys in part 4 ([design](../../specs/2026-10-06-japadhyan-in-sagevani-design.md#53-not-wired-into-deploys-yet)).

Steps 1 to 4 are `src/japa/catalog-build`, run by `scripts/japa-content-build.ts`. Media checksums wait for the [hosting choice](../product/open-questions.md#content-hosting). The manifest used to be signed. That was dropped on 2026-10-06, because packs come from the same site as the code that reads them ([device](#device)).

- **Validation** checks the layout above and the references between files:
  - ids are unique
  - a deity's tradition, parent and featured practice, a practice's deities and a program's practices all exist
  - a deity's parent and a practice's deities are in its tradition
  - a featured practice is one of that deity's
  - no deity is its own ancestor

  It also runs step 2's checks ([transliteration](#transliteration)). `npm run test:unit` runs it, so it is part of the website's checks and CI. `npm run japa:content:validate` runs it alone and prints each problem with its file and line.
- **`npm run japa:content:build -- --channel development`** runs every step up to the manifest.
  - It validates and generates, checks the version rules against the [reviewed snapshot](#the-reviewed-snapshot), builds the packs and checks each against its export schema.
  - Then it writes them with `manifest.json` to `japa-catalog/dist/<channel>/` (not committed), emptying that folder first so no stale pack survives, and writes the snapshot.
  - If any check finds a problem, it lists every one and writes nothing.
- **Channels.** A `development` build includes unreviewed practices, marked `reviewed: false` in the index; its release is 0 unless `--release` says otherwise. A `production` build needs `--release <number>`, above the last one published, and refuses to run while any practice is unreviewed at its current version, listing each. It doesn't leave them out, which could break a deity's `featured_practice_id`.
- **Canonical JSON.** Packs and the manifest are written with keys sorted by code point, strings in NFC, no whitespace and no trailing newline, so building the same content twice gives the same bytes and the same SHA-256.

```

- [ ] **Step 4: Delete everything from `### The build's sandbox` up to, not including, `### Packs`**

- [ ] **Step 5: Replace everything from `### Signing` up to, not including, `## Privacy of downloads` with:**

```markdown
- Packs are **data only**: text and references, never code or markup. `/japa` renders text as text.

## Device

| Layer | What | When |
| --- | --- | --- |
| **Core pack** | The `core` pack: the index, programs, and **every launch deity's** base pack and add-ons (about 2 MB of text in P1) | Cached on the first visit to `/japa`, so it works offline from then on. A `core` pack from a higher release replaces it |
| **Downloaded packs** | Base and add-on packs, stored in the browser's catalog store and search index | When a deity is opened, and **automatically for anything saved or starred** |
| **Audio** | Per practice | On demand, or "Download for offline" |

- **In P1, nothing more is downloaded to use the library.** The core pack holds it all, in one piece covering every launch deity, so no request names a deity. Per-deity downloads begin only when the library outgrows the core pack, and for audio.
- **Browsing and search work offline** because the index is in the core pack. A deity that hasn't been downloaded shows "Download to open", not an empty screen.
- **Settings → Storage** lists downloaded packs and audio, with sizes, and offers "Download everything for offline".
- **Updates:** `/japa` checks the manifest when online and fetches only packs whose SHA-256 changed.
- **Integrity:**
  - Every pack must match the SHA-256 listed in the manifest and pass the export schema, so a build bug or a damaged cache can't put altered text on screen.
  - Audio and images must match the SHA-256 recorded in their pack.
  - There is no signature. Packs come over HTTPS from the same site as the code that reads them, so anyone who could change a pack could change that code too.
- **Unpublished content** stays in browsers that have it, and its counts remain; it is hidden from browsing.

```

- [ ] **Step 6: In "Privacy of downloads", replace two bullets**

Replace the bullet that starts `- **Requests carry nothing that identifies the devotee:**` (the whole line) with:

```markdown
- **Requests carry no account token and no device id.** They are plain fetches of static files over HTTPS. They come from the website's own domain, so they do carry its first-party cookies, such as the like id and the comment token. Per-deity requests must not, so before per-deity downloads begin, packs move to a path or host that receives no cookies ([design](../../specs/2026-10-06-japadhyan-in-sagevani-design.md#44-sharing-a-site-with-the-blog)).
```

Replace the bullet that starts `- **P1 avoids the problem:**` (the whole line) with:

```markdown
- **P1 avoids the problem:** the launch library's text is all in the core pack, so opening a deity needs no request of its own.
```

- [ ] **Step 7: Check**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website/docs/japa/architecture
grep -i -E "sign|sandbox|ships inside|inside the app|CDN|bundle|phone" content-pipeline.md
```

Expected, and nothing else:
- the sentences that say signing was dropped
- the "no signature" integrity bullet
- the sentence about devotees' phones
- the heading "Why not bundle everything"

- [ ] **Step 8: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/docs/japa/architecture/content-pipeline.md
git commit -m "docs(japa): the content pipeline delivers packs from the website, unsigned"
```

### Task 5: Accounts and sync, chanting modes and the other feature specs

**Files:**
- Modify: `website/docs/japa/product/features/{accounts-and-sync,chanting-modes,mantra-library,onboarding,session-experience,age-modes-and-accessibility,content-and-learning}.md`

- [ ] **Step 1: `accounts-and-sync.md`**

Set `updated: 2026-10-06`. Insert this paragraph directly after the first paragraph (the one starting `The app works fully without an account.`):

```markdown
> Sync is our own code against Supabase, and sign-in is decided in part 3 ([Q-11](../../../../../docs/governance/open-questions.md)). This spec keeps the product behaviour. Where it names a mechanism, part 3 confirms it.
```

Replace everything from `## Sign-in methods (P1)` up to, not including, `## Consent before the first sync (P1)` with:

```markdown
## Sign-in methods (P1)

To be confirmed in part 3, which also chooses between Supabase Auth and Payload ([Q-11](../../../../../docs/governance/open-questions.md)).

- **Google**, through a redirect.
- **Apple**, through a redirect. On the web it is optional, not required. It stays for devotees who prefer it.
- **Email one-time code:** a 6-digit code, no password.
- **Email codes, not magic links:** a link may open in a different browser from the one that holds the devotee's practice.
- **Redirects, not popups,** in case the storage part 3 chooses needs cross-origin isolation headers, which cut popups off from the page that opened them.
- **Same person, several methods:** Google and Apple sign-ins that share a verified email belong to one account. Apple's "Hide my email" addresses won't match; **P2** adds "Link another sign-in method" in Settings.
- **Phone number (SMS code): later.** Every SMS costs money, and SMS pumping fraud is a real risk.

```

Then these replacements:

| Find | Replace with |
| --- | --- |
| `Offered earlier on the web, where browsers can clear stored data.` | `Browsers can clear stored data, so part 3 may make the first offer sooner.` |
| `This protects privacy on shared family phones.` | `This protects privacy on shared family phones and computers.` |
| `- **Settings → Account → Delete account**, in the app and on the web.` | ``- **Settings → Account → Delete account** in `/japa`.`` |
| `**On the phone or browser used to delete**` | `**In the browser used to delete**` |
| `The app asks the browser to keep it and offers backup sooner.` | `` `/japa` asks the browser to keep it and offers backup sooner.`` |
| `With PowerSync, row-level security guards writes and the sync stream queries guard downloads` | `Uploads and downloads both enforce this` |

Delete the line `Required by both app stores. Google Play also requires a web page for it.` and the blank line after it.

- [ ] **Step 2: `chanting-modes.md`**

Set `updated: 2026-10-06`. Delete these seven table rows (whole lines):

```text
| [Volume-button counting](#hands-free-counting)          | P1    | medium |
| [Flip face down to pause](#hands-free-counting)         | P1    | easy   |
| [Smartwatch](#hands-free-counting)                      | P2    | medium |
| [Bluetooth rings / smart malas](#hands-free-counting)   | P4    | medium |
| Volume buttons          | P1     | P1                  | P1: next name            | —           |
| Flip face down to pause | P1     | P1                  | P1                       | P2          |
| Smartwatch              | P2     | P2                  | P2                       | —           |
```

Replacements:

| Find | Replace with |
| --- | --- |
| `- Light haptic on every bead; stronger haptic (and optional bell) at the meru bead.` | `- A light vibration on every bead and a stronger one at the meru bead, where the browser can vibrate (Android). A visual cue at the meru everywhere, and an optional bell.` |
| `guided by a soft visual/haptic pulse.` | `guided by a soft visual pulse, with vibration where the browser supports it.` |

Replace everything from `## Hands-free counting` up to, not including, `## Manual log and corrections` with:

```markdown
## Hands-free counting

Not part of JapaDhyan on the web ([D-006](../../../../../docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa)). Volume buttons, flip face down to pause, smartwatch apps and Bluetooth rings need a native app. Their plans are in the [archived repository](https://github.com/shashesh/japadhyan/blob/master/docs/product/features/wearables-and-hardware.md).

```

- [ ] **Step 3: The other feature specs.** Set `updated: 2026-10-06` in each file you change.

| File | Find | Replace with |
| --- | --- | --- |
| `mantra-library.md` | `with a small core bundled in the app` | ``with a core pack that `/japa` caches on the first visit`` |
| `mantra-library.md` | `mala tap, silent chanting, volume buttons and manual logging` | `mala tap, silent chanting and manual logging` |
| `onboarding.md` | `from install to first repetition` | ``from opening `/japa` to first repetition`` |
| `onboarding.md` | `Works with no connection: the onboarding deities are in the app's core content bundle` | ``Works with no connection after the first visit: the onboarding deities are in the core pack, which `/japa` caches then`` |
| `onboarding.md` | `The language comes from the phone's setting` | `The language comes from the browser's setting` |
| `onboarding.md` | `A short explanation comes before the phone's notification prompt. Not shown on web.` | ``A short explanation comes before the browser's notification prompt. Reminders need web push, designed in part 3; until then this step is not shown. On iPhone, push works only once `/japa` is on the home screen.`` |
| `session-experience.md` | `Screen stays awake; notifications silenced for the session (where the OS allows).` | `Screen stays awake (Screen Wake Lock).` |
| `session-experience.md` | `at the meru comes a strong haptic, an optional bell and the offering card` | `at the meru comes a visual cue, a strong vibration where the browser can, an optional bell and the offering card` |
| `age-modes-and-accessibility.md` | `Haptic and audio feedback so counting works without sight.` | `Audio feedback, and vibration where the browser supports it, so counting works without sight.` |
| `content-and-learning.md` | `- Short, readable on a phone, offline once downloaded.` | ``- Short and readable on a phone. Articles are blog pages, so reading one needs a connection; `/japa` itself works offline.`` |

In `content-and-learning.md`, insert this paragraph directly under the heading `## Starter articles (P1)`:

```markdown
Articles are SageVani articles, written in the website's CMS and linked from `/japa` ([D-006](../../../../../docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa)). JapaDhyan has no article system of its own.
```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/docs/japa/product/features
git commit -m "docs(japa): feature specs for the browser: no hands-free hardware, vibration where it exists"
```

### Task 6: Vision, roadmap and open questions

**Files:**
- Modify: `website/docs/japa/product/{vision,roadmap,open-questions}.md`

- [ ] **Step 1: Replacements.** Set `updated: 2026-10-06` in each file.

| File | Find | Replace with |
| --- | --- | --- |
| `vision.md` | `in the Dharmic traditions of India and Indo-Asia, on web, Android and iOS.` | `in the Dharmic traditions of India and Indo-Asia, in the browser, as part of [SageVani](../../../../README.md).` |
| `vision.md` | `Tap, type, voice, silent, watch — all feed the same total.` | `Tap, type, voice, silent — all feed the same total.` |
| `vision.md` | `Voice audio never leaves the phone.` | `Voice audio never leaves the device.` |
| `roadmap.md` | ``Effort tags: `easy` `` | see the next block |
| `roadmap.md` | `**Goal:** a devotee can install the app, pick a practice` | ``**Goal:** a devotee can open `/japa`, pick a practice`` |
| `roadmap.md` | ``Volume-button counting `medium` · Flip face down to pause `easy` · `` | (nothing) |
| `roadmap.md` | `Android, iOS, web · Offline-first` | `Desktop and mobile browsers · Offline-first` |
| `roadmap.md` | `add the headline voice feature, chanting without the phone in hand, and a year-round` | `add the headline voice feature and a year-round` |
| `roadmap.md` | ``Voice counting `hard` · Smartwatch apps `medium` · `` | ``Voice counting `hard` · `` |
| `roadmap.md` | `, [wearables-and-hardware](features/wearables-and-hardware.md)` | (nothing) |
| `roadmap.md` | `**Goal:** hardware and partners that support` | `**Goal:** partners that support` |

For the `Effort tags` row: put this paragraph, then a blank line, in front of the line that starts ``Effort tags: `easy` ``:

```markdown
JapaDhyan runs in the browser as SageVani's `/japa` section ([D-006](../../../../docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa)). Features that need a native app (volume buttons, flip face down to pause, smartwatch apps, Bluetooth rings) were dropped on 2026-10-06.
```

In `roadmap.md`, delete the whole table row that starts `| Hardware | Bluetooth japa rings`.

- [ ] **Step 2: `open-questions.md`.** Replace everything from `## Sync engine` up to, not including, `## Content hosting` with:

```markdown
## Sync engine

Our own sync against Supabase ([D-006](../../../../docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa)), designed in part 3: browser storage, sign-in (Q-11 in [SageVani's open questions](../../../../docs/governance/open-questions.md)), upload and download, against the [requirements in data-model](../architecture/data-model.md#sync-engine). PowerSync was accepted first and dropped with the native apps.

```

Replace the paragraph `Where packs and audio are hosted: Supabase Storage or Cloudflare R2. Decided in the content pipeline milestone ([content-pipeline](../architecture/content-pipeline.md)).` with:

```markdown
Packs are static files served with the website. Where audio is hosted is decided when audio arrives: Supabase Storage, which the website already uses, or Cloudflare R2 ([content-pipeline](../architecture/content-pipeline.md)).
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/docs/japa/product
git commit -m "docs(japa): vision, roadmap and open questions for a browser-only JapaDhyan"
```

### Task 7: The decisions that carry across

**Files:**
- Modify: `website/docs/japa/decisions/{2026-09-22-content-packs,2026-09-22-guest-first-accounts,2026-09-23-schema-library-zod,2026-09-23-transliteration-library}.md`

- [ ] **Step 1: Add `updated: 2026-10-06`** under the `date:` line in the front matter of each of the four files.

- [ ] **Step 2: Replacements**

| File | Find | Replace with |
| --- | --- | --- |
| `content-packs` | `iOS blocks downloads over 200 MB on mobile data, and many devotees have phones with little storage. The app must still work offline from the moment it is installed.` | ``Many devotees have phones with little storage and costly data. `/japa` must still work offline after its first visit.`` |
| `content-packs` | `publishes versioned, compressed **packs** and a **signed manifest** to a CDN. The app has the public key built in and accepts only packs listed in a manifest whose signature verifies.` | `publishes versioned **packs** and a **manifest** as static files with the website. The manifest was signed until 2026-10-06; that was dropped because packs come from the same site as the code that reads them ([D-006](../../../../docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa)).` |
| `content-packs` | `a **core bundle** ships inside the app:` | ``a **core pack** is cached by `/japa` on the first visit:`` |
| `content-packs` | `- The app stays small, and content fixes ship without an app release.` | `- Content fixes ship without a code change.` |
| `content-packs` | `outside the core bundle` | `outside the core pack` |
| `guest-first-accounts` | `Google, Apple and an email one-time code. Apple is required on iOS because we offer Google.` | `Google, Apple and an email one-time code, to be confirmed in part 3 with the sign-in provider ([Q-11](../../../../docs/governance/open-questions.md)).` |
| `guest-first-accounts` | `Deleting an account is available in the app and on the web,` | ``Deleting an account is available in `/japa`,`` |
| `guest-first-accounts` | `if they lose their phone;` | `if they lose their phone or the browser clears its data;` |
| `schema-library-zod` | `- One more runtime dependency in the app bundle, listed in [TECH-VERSIONS](../../TECH-VERSIONS.md).` | `- One more runtime dependency in the browser bundle. The website already depends on Zod.` |
| `transliteration-library` | ``- **`@siva-sh/vidyut` goes into [TECH-VERSIONS](../../TECH-VERSIONS.md)** when the build installs it.`` | ``- **`@siva-sh/vidyut` is pinned** in `website/package.json`.`` |

- [ ] **Step 3: `transliteration-library.md`.** Replace everything from the line that starts `- **The package never runs where the signing key can be reached.**` up to, not including, the line that starts `- **vidyut-lipi itself is quiet.**` with:

```markdown
- **Content signing was dropped on 2026-10-06** ([D-006](../../../../docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa)), and the build's sandbox with it, so no key is at risk. The package still runs with the owner's permissions whenever the build or the tests run, which is why it stays pinned and every upgrade's diff of generated text is read. The worst compromised code can do is write wrong text, which the IAST check, the round trip and the reviewed snapshot are there to catch.

```

- [ ] **Step 4: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/docs/japa/decisions
git commit -m "docs(japa): decisions that carry across drop the app bundle, iOS rules and signing"
```

### Task 8: New paths, the index and the links

**Files:**
- Modify: every file under `website/docs/japa/`
- Create: `website/docs/japa/README.md`

- [ ] **Step 1: Rewrite repository paths to their new homes**

Lines that link to the archived repository are skipped, because their URLs must keep the old paths.

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website/docs/japa
find . -name '*.md' -exec sed -i '/github\.com\/shashesh\/japadhyan/!{
s#packages/shared/src/#src/japa/domain/#g
s#packages/shared#src/japa/domain#g
s#tools/content-build/src/#src/japa/catalog-build/#g
s#tools/content-build#src/japa/catalog-build#g
s#content-snapshot/#japa-catalog/snapshot/#g
s#`content/#`japa-catalog/content/#g
s#dist/content/#japa-catalog/dist/#g
s#npm run content:validate#npm run japa:content:validate#g
s#npm run content:build#npm run japa:content:build#g
}' {} +
grep -rn -E "packages/shared|tools/content-build|content-snapshot|npm run content:" . | grep -v "github.com/shashesh/japadhyan" || echo "none left"
```

Expected: `none left`.

- [ ] **Step 2: Create `website/docs/japa/README.md` with exactly this content**

```markdown
# JapaDhyan documents

JapaDhyan is the naam japam section of the website at `/japa` ([D-006](../../../docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa)). These documents moved here from the [archived JapaDhyan repository](https://github.com/shashesh/japadhyan) on 2026-10-06. Its history, the documents for the dropped native apps and the PowerSync prototype stay there.

- [Design spec for the move](../specs/2026-10-06-japadhyan-in-sagevani-design.md) and its [plan](../plans/2026-10-06-japadhyan-move.md)

Adding, moving or retiring a document here: update this index in the same commit.

## Product

- [vision](product/vision.md) — who it is for, the core loop, guiding principles
- [roadmap](product/roadmap.md) — all features grouped into four phases
- [open questions](product/open-questions.md) — undecided: languages, pricing, content sourcing, sync
- [glossary](product/glossary.md) — japa, mala, sankalpa, likhita japa and other terms

### Feature specs

- [chanting modes](product/features/chanting-modes.md) — tap, word-by-word, typing, voice, silent, listening
- [session experience](product/features/session-experience.md) — the chanting screen and the offering moment
- [mantra library](product/features/mantra-library.md) — deities and their practices, favourites and defaults, custom and private guru mantras
- [onboarding](product/features/onboarding.md) — first visit to first repetition in under a minute, no account
- [accounts and sync](product/features/accounts-and-sync.md) — optional account, consent, combining data, sign-out, deletion, export
- [sankalpa and progress](product/features/sankalpa-and-progress.md) — vows and intentions, streaks, charts, milestones, reflection
- [festival programs](product/features/festival-programs.md) — Navaratri, Shivratri, Janmashtami and the festival calendar
- [dedication and offering](product/features/dedication-and-offering.md) — dedicating japa, printed japa books, temple offerings
- [content and learning](product/features/content-and-learning.md) — articles (as SageVani articles), pronunciation, ambient sound
- [community](product/features/community.md) — family goals, festival counters, chanting rooms
- [age modes and accessibility](product/features/age-modes-and-accessibility.md) — kids, seniors, accessibility
- [dharmic traditions](product/features/dharmic-traditions.md) — Hindu, Sikh, Buddhist, Jain: practices and sensitivities
- [partners and revenue](product/features/partners-and-revenue.md) — temples, verified teachers, seva, donations, premium

## Architecture

- [platform principles](architecture/platform-principles.md) — browsers, offline-first, privacy
- [data model](architecture/data-model.md) — catalog, the devotee's data, counting rules, what sync must guarantee
- [content pipeline](architecture/content-pipeline.md) — writing the catalog in `japa-catalog/content/`, building packs, delivery to browsers

## Decisions

- [devotee first](decisions/2026-09-21-devotee-first.md) — build for individual devotees before temples and gurus
- [full scope in phases](decisions/2026-09-21-full-scope-in-phases.md) — keep every brainstormed feature, deliver in four phases
- [collective, not competitive](decisions/2026-09-21-collective-not-competitive.md) — shared goals instead of leaderboards
- [Dharmic traditions](decisions/2026-09-21-dharmic-traditions-scope.md) — Hindu, Sikh, Buddhist and Jain only
- [open audience](decisions/2026-09-21-open-audience.md) — open to everyone, no primary audience
- [free flow](decisions/2026-09-21-free-flow-nothing-locked.md) — every mala, mantra and mode open from day one
- [position deletion barrier](decisions/2026-09-22-position-deletion-barrier.md) — a deleted namavali position records when it was deleted, so merging converges
- [practices as ordered steps](decisions/2026-09-22-practice-model-ordered-steps.md) — a namavali recitation counts as one
- [content packs](decisions/2026-09-22-content-packs.md) — content written in the repository, delivered as packs
- [guest-first accounts](decisions/2026-09-22-guest-first-accounts.md) — no account needed; consent before sync
- [grouped count events](decisions/2026-09-22-grouped-count-events.md) — events grouped then sealed; corrections and manual logs are new events
- [Zod schemas](decisions/2026-09-23-schema-library-zod.md) — a strict content form and a forward-compatible export form
- [transliteration](decisions/2026-09-23-transliteration-library.md) — vidyut-lipi generates the Indic scripts; our own rules produce `latin`

The tech-stack, PowerSync, CI and app-name decisions were dropped with the native apps (D-006). They stay in the archived repository.

## Research

- [the Sai app](research/inspiration-sai-nama-japam.md) — the screen that inspired this project
```

- [ ] **Step 3: Find the links that no longer resolve**

Save this as `"${TMPDIR:-/tmp}/check-japa-links.mjs"`. It isn't committed.

```js
// Lists links in docs/japa that don't resolve, with the archived-repository URL each pointed to.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const ROOT = resolve('docs/japa') // run from website/
const ARCHIVE = 'https://github.com/shashesh/japadhyan/blob/master/'
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : [],
  )

let broken = 0
for (const file of walk(ROOT)) {
  for (const [, href] of readFileSync(file, 'utf8').matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(href)) continue
    const [path, anchor] = href.split('#')
    if (existsSync(resolve(dirname(file), path))) continue
    broken++
    // docs/japa/ was docs/ in the old repository, and its root was one level up.
    const old = relative(ROOT, resolve(dirname(file), path)).split('\\').join('/')
    const oldPath = old.startsWith('../') ? old.replace(/^(\.\.\/)+/, '') : `docs/${old}`
    console.log(`${relative(ROOT, file)}: ${href}\n    archived: ${ARCHIVE}${oldPath}${anchor ? `#${anchor}` : ''}`)
  }
}
console.log(`${broken} broken link(s)`)
process.exit(broken ? 1 : 0)
```

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
node "${TMPDIR:-/tmp}/check-japa-links.mjs"
```

Expected: a list of broken links. These point at the dropped decisions, the plans, `INDEX.md`, `TECH-VERSIONS.md` and `CLAUDE.md`.

- [ ] **Step 4: Fix each one by this rule**

- **Target was `docs/INDEX.md` or `docs/README.md`:** link to the new index instead, `README.md` relative to the file (from `product/features/` that is `../../README.md`).
- **Target is under the old `content/`:** link to the same file under `japa-catalog/content/`, relative to the file (from `architecture/` that is `../../../japa-catalog/content/…`).
- **Anything else:** replace the href with the `archived:` URL the script printed.

Run the script again.

Expected: `0 broken link(s)`.

- [ ] **Step 5: Last sweep for native and PowerSync wording**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website/docs/japa
grep -rn -i -E "powersync|expo|react native|app store|google play|wear os|smartwatch|volume.button|face down|bluetooth|op-sqlite|wa-sqlite|signed manifest|signing key|core bundle|ships inside|inside the app|TECH-VERSIONS|CLAUDE\.md|apps/mobile|plans/active" .
```

Every hit must be one of these:
- a sentence saying the feature or tool was dropped
- a link to the archived repository
- "Vibration works only in Android browsers"

Fix anything else in the same spirit as Tasks 2–7.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/docs/japa
git commit -m "docs(japa): an index, new paths, and links to the archived repository"
```

### Task 9: D-006 and the workspace documents

**Files:**
- Modify: `docs/governance/decisions.md`, `docs/governance/open-questions.md`, `docs/project-brief.md`, `README.md`, `AGENTS.md`, `CHANGELOG.md`, `website/docs/specs/2026-10-05-sagevani-website-design.md`

- [ ] **Step 1: `docs/governance/decisions.md`.** Insert this, followed by a blank line, directly before the line `## New decision template`:

```markdown
## D-006 — JapaDhyan joins SageVani at /japa

- Date: 2026-10-06
- Status: Confirmed by owner. The [design spec](../../website/docs/specs/2026-10-06-japadhyan-in-sagevani-design.md) was approved on 2026-10-06.
- Question: JapaDhyan, the owner's naam japam app, was planned as a React Native app for iOS, Android and the web. Should it stay a separate native app, or join SageVani?
- Decision:
  - **A section of the website.** JapaDhyan becomes `/japa` inside the website's Next.js app, for desktop and mobile browsers. It deploys with the site and uses the same Supabase project, in its own `japa` schema. There are no iOS, Android or watch apps.
  - **Offline-first, with our own sync.** A devotee's practice is stored in the browser and works with no connection and no account. An optional account syncs through code written against Supabase. PowerSync is dropped.
  - **Catalog in the repository.** Traditions, deities and practices stay as YAML in `website/japa-catalog/`, built into packs by the content build. Content signing is dropped, since packs come from the same site as the code that reads them.
  - **Articles are SageVani articles.** JapaDhyan has no article system of its own.
  - **Google Analytics never records `/japa`.** Which practice someone chants is religious data.
  - **Order.** The move lands now. An offline spike proves `/japa` works offline inside the Next.js app. The `/japa` screens are built after stage 3. The blog launches on its own plan.
- Reason: The owner wants JapaDhyan as SageVani's naam japam feature. One site gives one deploy, one design and one database, and a browser reaches desktop and mobile without app stores.
- Owner approval: Owner's answers and section-by-section approvals in the 2026-10-06 design session.
- Documents affected: [JapaDhyan's documents](../../website/docs/japa/README.md), the [website design spec](../../website/docs/specs/2026-10-05-sagevani-website-design.md) (section 19), the project brief, open questions, `AGENTS.md`, the README.
- Supersedes: JapaDhyan's own tech-stack (React Native and Expo), sync-engine (PowerSync) and app-name decisions, which stay in the [archived JapaDhyan repository](https://github.com/shashesh/japadhyan).
- Pending:
  - How devotees sign in to JapaDhyan (Q-11).
  - Web-push reminders (Q-12).
  - The offline spike (part 2) and our own sync (part 3).
```

- [ ] **Step 2: `docs/governance/open-questions.md`.** Insert these two rows directly after the row that starts `| Q-09 |`:

```markdown
| Q-11 | How do devotees sign in to JapaDhyan: Supabase Auth or Payload, and with which methods? | D-004 has no reader accounts, and JapaDhyan's optional account needs one (D-006). Decided in its sync design. |
| Q-12 | Should JapaDhyan offer reminders through web push? | Browsers can't schedule local notifications, and on iPhone push needs a home-screen install (D-006). Decided in its sync design. |
```

- [ ] **Step 3: `docs/project-brief.md`.** Insert this row directly after the table row that starts `| Website |`:

```markdown
| JapaDhyan | The owner's naam japam app, joining the website as its `/japa` section ([D-006](governance/decisions.md)) |
```

In the "Unresolved" paragraph, replace `and where completed piece worksheets live remain open.` with `where completed piece worksheets live, and JapaDhyan's sign-in and reminders remain open.`

- [ ] **Step 4: `README.md`.** Replace `and [D-004](docs/governance/decisions.md#d-004--website-platform-and-design).` with:

```markdown
and [D-004](docs/governance/decisions.md#d-004--website-platform-and-design). JapaDhyan, a naam japam app, joins the website as its `/japa` section ([D-006](docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa)); its documents are in [`website/docs/japa/`](website/docs/japa/README.md).
```

- [ ] **Step 5: `AGENTS.md`.** Append at the end of the file, after a blank line:

```markdown
## JapaDhyan

JapaDhyan is the naam japam section at `/japa` (D-006). Its documents are in `website/docs/japa/`.

- Every chanting mode records count events. Totals are always derived from events, never stored as a counter.
- Count events are sealed, then never edited. Fixes are `correction` events; practice done elsewhere is a `manual` event. Group days by an event's `local_day`, never by converting `created_at`.
- Every practice is an ordered list of steps. Counts are in repetitions: a full namavali is one recitation. A place in a namavali is a position, never a count.
- Catalog content lives in `website/japa-catalog/content/`. Never hard-code mantras or deities in code.
- The owner reviews every practice, and production packs refuse unreviewed ones. Do not invent mantra text, meanings or transliterations.
- Listening japa is counted separately and never added to the chanted total.
- Private guru mantras never store their words, and are excluded from sharing, community and analytics.
- Voice audio never leaves the device.
- Nothing stands between opening `/japa` and chanting: no ads, upsells or articles.
- No leaderboards. Community features are shared goals.
- Google Analytics never records `/japa`.
- `website/src/japa/domain` stays free of React, Next, Payload, Node and browser globals. Its types keep snake_case field names.
```

- [ ] **Step 6: The website design spec.** Append at the end of `website/docs/specs/2026-10-05-sagevani-website-design.md`, after a blank line:

```markdown
## 19. JapaDhyan at `/japa`

JapaDhyan, the naam japam app, joins the site as `/japa` ([D-006](../../../docs/governance/decisions.md), [design](2026-10-06-japadhyan-in-sagevani-design.md), [its documents](../japa/README.md)). It is built after stage 3 and works offline in the browser. Two rules bind the rest of the site now:

- Google Analytics never records a `/japa` page, even after a reader has accepted cookies on the blog and moves to `/japa` without a full page load. Which practice someone chants is religious data.
- The reader accounts excluded in section 3 stay excluded for the blog. JapaDhyan's optional account is decided separately (Q-11).
```

- [ ] **Step 7: `CHANGELOG.md`.** Insert this, followed by a blank line, directly after the line `# Change log` and its blank line:

```markdown
## 2026-10-06 — JapaDhyan joins the website

- Recorded [D-006](docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa): JapaDhyan, the owner's naam japam app, becomes the website's `/japa` section, for browsers only, with its own offline storage and sync.
- Added the [design spec](website/docs/specs/2026-10-06-japadhyan-in-sagevani-design.md), the [move plan](website/docs/plans/2026-10-06-japadhyan-move.md), and JapaDhyan's documents in [`website/docs/japa/`](website/docs/japa/README.md).
- Added Q-11 (sign-in for JapaDhyan) and Q-12 (web-push reminders). Updated the project brief, the website design spec, `AGENTS.md` and the README.
- No JapaDhyan code is in the website yet.
```

- [ ] **Step 8: Check that D-006 isn't already taken**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
grep -c "^## D-006" docs/governance/decisions.md
grep -c "^| Q-11 \|^| Q-12 " docs/governance/open-questions.md
```

Expected: `1` and `2`. If stage 1 or another change has taken D-006, Q-11 or Q-12 by now, take the next free numbers and update every reference in this phase (`grep -rn "D-006\|Q-11\|Q-12" docs website/docs AGENTS.md README.md CHANGELOG.md`).

- [ ] **Step 9: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add docs AGENTS.md README.md CHANGELOG.md website/docs/specs/2026-10-05-sagevani-website-design.md
git commit -m "docs: record D-006, JapaDhyan joins the website at /japa"
```

### Task 10: Open the docs pull request (after stage 1 merges)

- [ ] **Step 1: Wait for stage 1.** Run `gh pr view 1 --repo shashesh/sagevani --json state -q .state`. Continue only when it prints `MERGED`.

- [ ] **Step 2: Rebase onto the new `main`.** Stage 1 is squash-merged, so its commits under this branch must be dropped.

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git fetch origin
FIRST=$(git log --format=%H --grep='^docs: design spec for moving JapaDhyan into SageVani$' docs/japadhyan-move)
git rebase --onto origin/main "$FIRST^" docs/japadhyan-move
git log --oneline origin/main..docs/japadhyan-move
```

Expected: only this phase's commits, starting with the design spec. If the rebase stops on a conflict in a workspace document, keep both sides' content: stage 1's final text, plus this phase's addition.

- [ ] **Step 3: Push and open the pull request**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git push -u origin docs/japadhyan-move
gh pr create --base main --head docs/japadhyan-move \
  --title "docs: JapaDhyan joins the website at /japa" \
  --body "Part 1 of website/docs/specs/2026-10-06-japadhyan-in-sagevani-design.md, Phase A of website/docs/plans/2026-10-06-japadhyan-move.md: D-006, JapaDhyan's documents in website/docs/japa/ cleaned of native and PowerSync material, and the workspace documents. Documentation only."
gh pr edit --add-reviewer @copilot
```

- [ ] **Step 4: [OWNER] Review and merge.** Address Copilot's comments, then hand over. The owner merges.

---

## Phase B — Code pull request (branch `feat/japa-domain-and-catalog`)

Start from the tip of Phase A, before or after it is pushed.

### Task 11: Branch and dependencies

**Files:**
- Modify: `website/package.json`, `website/package-lock.json`

- [ ] **Step 1: Branch and install**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git switch -c feat/japa-domain-and-catalog docs/japadhyan-move
cd website
npm ci
npm install --save-exact @noble/hashes@2.4.0
npm install --save-exact --save-dev @siva-sh/vidyut@0.3.0 yaml@2.9.1
git diff --stat
```

Expected: only `package.json` and `package-lock.json` change. `@noble/hashes` is a runtime dependency because the domain code runs in the browser; the other two only run in the content build.

- [ ] **Step 2: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/package.json website/package-lock.json
git commit -m "chore: add JapaDhyan's dependencies"
```

### Task 12: Move the domain logic and its tests

**Files:**
- Create: `website/src/japa/domain/**` (29 files)
- Create: `website/tests/unit/japa/domain/**` (18 files)
- Modify: `website/vitest.config.mts`

- [ ] **Step 1: Save the test-moving helper** as `"${TMPDIR:-/tmp}/japa-move-tests.mjs"`. It isn't committed.

```js
// node japa-move-tests.mjs <srcDir> <alias> <destDir>
// Copies every *.test.ts under srcDir to destDir as *.unit.spec.ts, keeping subfolders.
// Relative imports are resolved against the test's original place and rewritten to the
// alias, so `./hlc` in logic/hlc.test.ts becomes `@/japa/domain/logic/hlc`.
// `@japadhyan/shared` becomes `@/japa/domain`.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const [srcDir, alias, destDir] = process.argv.slice(2)
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.test.ts') ? [join(dir, e.name)] : [],
  )

let count = 0
for (const file of walk(srcDir)) {
  const out = join(destDir, relative(srcDir, file).replace(/\.test\.ts$/, '.unit.spec.ts'))
  const text = readFileSync(file, 'utf8')
    .replace(/(from\s+|import\s*\(\s*)(['"])(\.{1,2}\/[^'"]*)\2/g, (_m, pre, q, spec) => {
      const target = relative(srcDir, resolve(dirname(file), spec)).split('\\').join('/')
      return `${pre}${q}${alias}/${target}${q}`
    })
    .replaceAll("'@japadhyan/shared'", "'@/japa/domain'")
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, text)
  count++
}
console.log(`${count} test file(s) written to ${destDir}`)
```

- [ ] **Step 2: Copy the source and the tests.** `rows.ts` (the PowerSync row codecs) and its test are left behind.

```bash
SRC=/c/Users/shash/Documents/personal-github-repos/japadhyan
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
(cd "$SRC/packages/shared/src" && find . -name '*.ts' ! -name '*.test.ts' ! -path './logic/rows.ts') |
  while read -r f; do install -D "$SRC/packages/shared/src/$f" "src/japa/domain/$f"; done
node "${TMPDIR:-/tmp}/japa-move-tests.mjs" "$SRC/packages/shared/src" '@/japa/domain' tests/unit/japa/domain
rm tests/unit/japa/domain/logic/rows.unit.spec.ts
sed -i "/export \* from '.\/rows';/d" src/japa/domain/logic/index.ts
find src/japa/domain -name '*.ts' | wc -l
find tests/unit/japa/domain -name '*.unit.spec.ts' | wc -l
grep -rn "rows" src/japa/domain/logic/index.ts || echo "rows export gone"
```

Expected: `29`, then `19 test file(s) written…` followed by `18` after the removal, then `rows export gone`.

- [ ] **Step 3: Point comments at the new document paths**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
find src/japa tests/unit/japa -name '*.ts' -exec sed -i \
  -e 's#docs/architecture/#docs/japa/architecture/#g' \
  -e 's#docs/decisions/#docs/japa/decisions/#g' \
  -e 's#docs/product/#docs/japa/product/#g' {} +
```

The relative links in `devPractices.ts` (`../../../../docs/…`) still resolve: four levels up from `src/japa/domain/constants/` is `website/`.

- [ ] **Step 4: Update the two plan references in `src/japa/domain/constants/devPractices.ts`**

Replace ` * See docs/plans/active/2026-09-21-phase-1-plan.md — M6 removes this file.` with:

```ts
 * Part 4 removes this file, once /japa reads the catalog from packs.
```

Replace these two lines:

```ts
      'devPractices() holds unreviewed development fixtures and must not run in a ' +
        'production build. Real content arrives as signed packs; see M2/M3 in ' +
        'docs/plans/active/2026-09-21-phase-1-plan.md.',
```

with:

```ts
      'devPractices() holds unreviewed development fixtures and must not run in a ' +
        'production build. Real content arrives as packs; see ' +
        'website/docs/japa/architecture/content-pipeline.md.',
```

Its test only checks `/production build/i`, which still matches.

- [ ] **Step 5: Format to this repository's style.** No semicolons, single quotes, width 100.

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
npx prettier --write src/japa tests/unit/japa
grep -rln "from '\.\{1,2\}/" tests/unit/japa || echo "no relative imports in tests"
```

Expected: `no relative imports in tests`.

- [ ] **Step 6: Take `src/japa` into coverage.** In `website/vitest.config.mts`, replace:

```ts
      include: ['src/access/**', 'src/lib/**', 'src/collections/**'],
```

with:

```ts
      include: ['src/access/**', 'src/lib/**', 'src/collections/**', 'src/japa/**'],
      exclude: ['src/japa/**/index.ts', 'src/japa/**/*.fixtures.ts'],
```

- [ ] **Step 7: Run the moved tests**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/japa
```

Expected: PASS for all 18 files. They passed in JapaDhyan, so a failure here comes from the move: an import path, the alias, or a TypeScript or Vitest difference. Fix the moved file, not the test's assertion.

- [ ] **Step 8: Type-check and lint**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
npm run typecheck
npm run lint
```

Expected: both pass. This repository uses TypeScript 5.7 and JapaDhyan used 6.0, and the lint rules differ. Fix what they report in the moved code with the smallest change. Do not change `tsconfig.json`, the lint configuration or the TypeScript version. Re-run Step 7 after any fix.

- [ ] **Step 8a: Check coverage of the moved code**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/japa --coverage --coverage.include='src/japa/domain/**'
```

Expected: lines, functions, branches and statements each at or above 80%.

- [ ] **Step 9: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/src/japa website/tests/unit/japa website/vitest.config.mts
git commit -m "feat: move JapaDhyan's domain logic and its tests into src/japa/domain"
```

### Task 13: Drop content signing from the domain

**Files:**
- Modify: `website/src/japa/domain/types/packs.ts`, `website/src/japa/domain/schemas/packs.ts`
- Test: `website/tests/unit/japa/domain/schemas/packs.unit.spec.ts`

- [ ] **Step 1: Remove the signature from the test first**

In `tests/unit/japa/domain/schemas/packs.unit.spec.ts`:
- Delete `ManifestSignature,` from the type import.
- Change the schema import to `import { manifestSchema, packIdSchema, packSchemas } from '@/japa/domain/schemas/packs'`.
- In the `contract` tuple, delete the line `Same<Output<typeof manifestSignatureSchema>, ManifestSignature>,` and one `true` from the array after it, leaving seven.
- Delete the whole `describe('manifestSignatureSchema', …)` block.
- Delete the `signature()` helper function and the `SIGNATURE` constant it uses (search for `SIGNATURE`). Delete `SIGNATURE` too if nothing else uses it.

- [ ] **Step 2: Run the test**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/japa/domain/schemas/packs.unit.spec.ts
```

Expected: PASS. The schema still exists but nothing tests it.

- [ ] **Step 3: Remove the schema and the type**

In `src/japa/domain/schemas/packs.ts`, delete the block that starts with the comment `` /** `manifest.sig.json`. A 64-byte signature is 86 base64 digits and `==`. */ `` and ends with the `})` that closes `manifestSignatureSchema`.

In `src/japa/domain/types/packs.ts`:
- Delete the `ManifestSignature` interface and the comment above it (`` /** `manifest.sig.json`: the signature over the exact bytes of `manifest.json`. */ ``).
- Replace `/** The list of packs a release is made of. Signed; see {@link ManifestSignature}. */` with `/** The list of packs a release is made of. */`.
- Replace `so an old but validly signed manifest can't roll content back.` with `so a stale cached manifest can't roll content back.`.
- In the file's first comment, replace `packs, and the signed manifest that lists` with `packs, and the manifest that lists`.

- [ ] **Step 4: Check nothing refers to signing**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
grep -rn -i "signature\|signed\|ed25519" src/japa tests/unit/japa || echo "no signing left"
npm run typecheck
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/japa
```

Expected: `no signing left`, the type check passes, and all tests pass.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/src/japa website/tests/unit/japa
git commit -m "refactor: drop content signing; packs come from the same site as the code"
```

### Task 14: Drop the chanting modes a browser can't do

**Files:**
- Modify: `website/src/japa/domain/types/practice.ts`

- [ ] **Step 1: Remove the three modes.** In the `ChantMode` union, delete these three lines, as Prettier formatted them in Task 12:

```ts
  | 'volume_button' // P1
  | 'watch' // P2
  | 'ring' // P4 - Bluetooth rings / smart malas
```

This repository writes no semicolons, so nothing else changes. `| 'handwriting' // P3` becomes the last member.

- [ ] **Step 2: Check and test**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
npx prettier --write src/japa/domain/types/practice.ts
grep -rn "volume_button\|'watch'\|'ring'" src/japa tests/unit/japa || echo "modes gone"
npm run typecheck
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/japa
```

Expected: `modes gone`, the type check passes, and all tests pass.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/src/japa/domain/types/practice.ts
git commit -m "refactor: drop the volume-button, watch and ring chanting modes"
```

### Task 15: Keep `src/japa/domain` pure

**Files:**
- Modify: `website/eslint.config.mjs`

- [ ] **Step 1: Write a file that breaks the rule** (the failing check). Save it as `website/src/japa/domain/purity-check.ts`:

```ts
import { readFileSync } from 'node:fs'
import { useState } from 'react'

export const broken = [readFileSync, useState, window.location.href]
```

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
npx eslint src/japa/domain/purity-check.ts
```

Expected: no errors about these imports, because the rule doesn't exist yet. That is the failure to fix.

- [ ] **Step 2: Add the rule.** In `website/eslint.config.mjs`, add this object to the `defineConfig([...])` array, directly after the object that sets `@typescript-eslint/no-unused-vars`:

```js
  {
    // JapaDhyan's domain logic runs in the browser, on the server and in the content build,
    // so it may depend on none of them (D-006).
    files: ['src/japa/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react/*', 'react-dom', 'react-dom/*'], message: 'src/japa/domain stays pure: no React.' },
            { group: ['next', 'next/*'], message: 'src/japa/domain stays pure: no Next.' },
            { group: ['payload', 'payload/*', '@payloadcms/*', '@payload-config'], message: 'src/japa/domain stays pure: no Payload.' },
            { group: ['node:*'], message: 'src/japa/domain runs in the browser too: no Node built-ins.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'indexedDB', 'location'].map(
          (name) => ({ name, message: 'src/japa/domain stays pure: inject what you need instead.' }),
        ),
      ],
    },
  },
```

- [ ] **Step 3: Check the rule catches all three**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
npx eslint src/japa/domain/purity-check.ts
```

Expected: 3 errors: `node:fs`, `react` and `window`.

- [ ] **Step 4: Remove the check file; the real code passes**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
rm src/japa/domain/purity-check.ts
npx prettier --write eslint.config.mjs
npm run lint
```

Expected: lint passes. If the moved code reports a violation, it reads a global it should have been given. Show the line to the owner before changing behaviour.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/eslint.config.mjs
git commit -m "chore: keep src/japa/domain free of React, Next, Payload, Node and browser globals"
```

### Task 16: Move the catalog and its build

**Files:**
- Create: `website/japa-catalog/content/**` (12 files), `website/japa-catalog/snapshot/**` (5 files)
- Create: `website/src/japa/catalog-build/*.ts` (14 files), `website/tests/unit/japa/catalog-build/*.unit.spec.ts` (10 files)
- Create: `website/scripts/japa-content-validate.ts`, `website/scripts/japa-content-build.ts`
- Modify: `website/package.json`, `website/.gitignore`, `website/.prettierignore`

- [ ] **Step 1: Copy the catalog and the snapshot byte for byte, and keep Prettier off them**

```bash
SRC=/c/Users/shash/Documents/personal-github-repos/japadhyan
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
mkdir -p japa-catalog
cp -r "$SRC/content" japa-catalog/content
cp -r "$SRC/content-snapshot" japa-catalog/snapshot
printf '\n# JapaDhyan catalog: the owner writes it; the content build writes the snapshot byte for byte\njapa-catalog/\n' >> .prettierignore
printf '\n# JapaDhyan packs, built by npm run japa:content:build\n/japa-catalog/dist/\n' >> .gitignore
find japa-catalog/content -type f | wc -l
find japa-catalog/snapshot -type f | wc -l
diff -r "$SRC/content" japa-catalog/content && diff -r "$SRC/content-snapshot" japa-catalog/snapshot && echo identical
```

Expected: `12`, `5`, `identical`.

- [ ] **Step 1a: Bring the catalog's own README up to date.** It isn't packed, so the byte-for-byte check in Step 9 is unaffected.

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
sed -i \
  -e 's#(\.\./docs/architecture/#(../../docs/japa/architecture/#g' \
  -e 's#npm run content:validate#npm run japa:content:validate#g' \
  -e 's#npm run content:build#npm run japa:content:build#g' \
  -e 's#`content-snapshot/`#`japa-catalog/snapshot/`#g' \
  -e 's#`content/`#`japa-catalog/content/`#g' \
  -e 's#`npm test`#`npm run test:unit`#g' \
  japa-catalog/content/README.md
grep -n -E "docs/|npm run|snapshot|npm test" japa-catalog/content/README.md
```

Expected: the link points to `../../docs/japa/architecture/content-pipeline.md`, and every command is a `japa:content:*` or `test:unit` script. Then add this sentence to the end of the README's first paragraph: `Run the commands below from `website/`.`

- [ ] **Step 2: Copy the build library and its tests.** The two command-line files become scripts in Step 7. Source files import the domain relatively, as `../domain`, so `tsx` and Vitest resolve them the same way.

```bash
SRC=/c/Users/shash/Documents/personal-github-repos/japadhyan
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
mkdir -p src/japa/catalog-build
for f in "$SRC"/tools/content-build/src/*.ts; do
  case "$(basename "$f")" in *.test.ts|cli.ts|build-cli.ts) continue;; esac
  cp "$f" src/japa/catalog-build/
done
sed -i "s#'@japadhyan/shared'#'../domain'#g" src/japa/catalog-build/*.ts
node "${TMPDIR:-/tmp}/japa-move-tests.mjs" "$SRC/tools/content-build/src" '@/japa/catalog-build' tests/unit/japa/catalog-build
find src/japa/catalog-build tests/unit/japa/catalog-build -type f | wc -l
```

Expected: `10 test file(s) written…`, then `24`.

- [ ] **Step 3: New paths in comments, messages and test expectations**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
find src/japa/catalog-build tests/unit/japa/catalog-build -name '*.ts' -exec sed -i \
  -e 's#docs/architecture/#docs/japa/architecture/#g' \
  -e 's#docs/decisions/#docs/japa/decisions/#g' \
  -e 's#content-snapshot/#japa-catalog/snapshot/#g' \
  -e 's#npm run content:build#npm run japa:content:build#g' {} +
sed -i 's#`content/\${#`japa-catalog/content/${#g' tests/unit/japa/catalog-build/build.unit.spec.ts
npx prettier --write src/japa/catalog-build tests/unit/japa/catalog-build
```

The tests now expect issues under `japa-catalog/content/…` and `japa-catalog/snapshot/…`, and expect the build to read the catalog from its new place.

- [ ] **Step 4: Run the build tests to see them fail**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/japa/catalog-build
```

Expected: FAIL in two places:
- `build.unit.spec.ts`: issues still say `content/…` and `content-snapshot/…`.
- `files.unit.spec.ts`: the catalog is read from `website/content`, which doesn't exist.

- [ ] **Step 5: Point the build at `japa-catalog/`.** In `src/japa/catalog-build/files.ts`, replace everything from `// The same depth from` through the `OUTPUT_ROOT` line with:

```ts
// website/japa-catalog/, from website/src/japa/catalog-build/.
const CATALOG_ROOT = resolve(import.meta.dirname, '../../../japa-catalog')

/** The catalog source. */
export const CONTENT_ROOT = join(CATALOG_ROOT, 'content')

/** The reviewed snapshot the version rules check against. Committed. */
export const SNAPSHOT_ROOT = join(CATALOG_ROOT, 'snapshot')

/** Where a build writes each channel's packs and manifest. Not committed. */
export const OUTPUT_ROOT = join(CATALOG_ROOT, 'dist')
```

In `src/japa/catalog-build/build.ts`:
- Replace every `under('content', ` with `under('japa-catalog/content', ` (three places).
- Replace `under('content-snapshot', ` with `under('japa-catalog/snapshot', `.
- In the comment `` /** Files are relative to the repo: `content/…` or `japa-catalog/snapshot/…`. */ ``, replace `` `content/…` `` with `` `japa-catalog/content/…` `` and `the repo` with `website/`.

- [ ] **Step 6: Run the tests to see them pass**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/japa
```

Expected: PASS, every file in `tests/unit/japa`. That includes `files.unit.spec.ts`, which validates the real catalog and checks the committed snapshot is current.

- [ ] **Step 7: The two commands.** Create `website/scripts/japa-content-validate.ts`:

```ts
// npm run japa:content:validate: checks japa-catalog/content/ and lists every problem.
// npm run test:unit runs the same check through files.unit.spec.ts.
import { CONTENT_ROOT, readContentTree } from '../src/japa/catalog-build/files'
import { formatIssue, plural } from '../src/japa/catalog-build/report'
import { validateContent } from '../src/japa/catalog-build/validate'

const { catalog, issues } = validateContent(readContentTree(CONTENT_ROOT))

for (const issue of issues) {
  console.error(formatIssue({ ...issue, file: `japa-catalog/content/${issue.file}` }))
}

if (issues.length > 0) {
  console.error(`\n${plural(issues.length, 'problem')} in japa-catalog/content/`)
  process.exit(1)
}

console.log(
  `japa-catalog/content/ is valid: ${[
    plural(catalog.traditions.length, 'tradition'),
    plural(catalog.deities.length, 'deity'),
    plural(catalog.practices.length, 'practice'),
    plural(catalog.programs.length, 'program'),
  ].join(', ')}`,
)
```

Create `website/scripts/japa-content-build.ts`:

```ts
// npm run japa:content:build -- --channel development|production [--release N]
// Lists every problem, or writes the packs, the manifest and the snapshot.
import { join, relative } from 'node:path'

import { build, parseBuildArgs } from '../src/japa/catalog-build/build'
import { CONTENT_ROOT, OUTPUT_ROOT, SNAPSHOT_ROOT } from '../src/japa/catalog-build/files'
import { formatIssue, plural } from '../src/japa/catalog-build/report'

const args = parseBuildArgs(process.argv.slice(2))
if (!args.ok) {
  console.error(args.message)
  process.exit(2)
}

const outDir = join(OUTPUT_ROOT, args.channel)
const { issues, manifest } = build({
  channel: args.channel,
  release: args.release,
  contentRoot: CONTENT_ROOT,
  snapshotRoot: SNAPSHOT_ROOT,
  outDir,
})

for (const issue of issues) console.error(formatIssue(issue))
if (manifest === null) {
  console.error(`\n${plural(issues.length, 'problem')}. Nothing was written.`)
  process.exit(1)
}

const bytes = manifest.packs.reduce((sum, p) => sum + p.bytes, 0)
const where = relative(process.cwd(), outDir) || '.'
console.log(
  `Built ${args.channel} release ${manifest.release}: ${plural(manifest.packs.length, 'pack')}, ` +
    `${(bytes / 1024).toFixed(1)} KiB, in ${where}. The snapshot is in japa-catalog/snapshot/.`,
)
```

In `website/package.json`, add these two lines to `scripts`, directly after the `"db:harden"` line:

```json
    "japa:content:validate": "cross-env NODE_OPTIONS=--no-deprecation tsx scripts/japa-content-validate.ts",
    "japa:content:build": "cross-env NODE_OPTIONS=--no-deprecation tsx scripts/japa-content-build.ts",
```

- [ ] **Step 8: Run both commands**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
npm run japa:content:validate
npm run japa:content:build -- --channel development
git status --porcelain japa-catalog
```

Expected:
- A line starting `japa-catalog/content/ is valid:`, counting 1 tradition and 5 practices.
- A line starting `Built development release 0:`.
- No `git status` output: the snapshot is unchanged and the packs are ignored.

- [ ] **Step 9: Prove the move changed nothing.** Build the same catalog in the old repository and compare byte for byte.

```bash
SRC=/c/Users/shash/Documents/personal-github-repos/japadhyan
cd "$SRC" && npm run content:build -- --channel development
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
diff -r "$SRC/dist/content/development" japa-catalog/dist/development && echo "packs identical"
diff -r "$SRC/content-snapshot" japa-catalog/snapshot && echo "snapshot identical"
git -C "$SRC" status --porcelain
```

Expected: `packs identical` and `snapshot identical`. The old repository's status shows no tracked file changed; its build output folders are ignored there. Any difference is a bug in the move. Find it before going on.

- [ ] **Step 10: Every check**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa/website
npm run lint
npm run typecheck
npm run format:check
npm run test:unit
npx cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit/japa --coverage --coverage.include='src/japa/**'
```

Expected: all pass, with coverage of `src/japa/**` at or above 80% on all four measures. If Docker is running, also run `npm run db:up && npm run test:coverage`, the full suite CI runs.

- [ ] **Step 11: Commit**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add website/japa-catalog website/src/japa/catalog-build website/tests/unit/japa/catalog-build website/scripts/japa-content-validate.ts website/scripts/japa-content-build.ts website/package.json website/.gitignore website/.prettierignore
git commit -m "feat: move JapaDhyan's catalog and content build into the website"
```

### Task 17: Changelog and the code pull request

- [ ] **Step 1: `CHANGELOG.md`.** Insert this, followed by a blank line, directly after `# Change log` and its blank line:

```markdown
## 2026-10-06 — JapaDhyan's domain logic and catalog

- Moved JapaDhyan's types, schemas and pure logic into `website/src/japa/domain`, with their tests, under the 80% coverage floor. A lint rule keeps it free of React, Next, Payload, Node and browser globals.
- Moved the catalog to `website/japa-catalog/` and its content build to `website/src/japa/catalog-build`, run with `npm run japa:content:validate` and `npm run japa:content:build`. A development build in the new place matches the old repository's byte for byte.
- Dropped content signing, the PowerSync row codecs, and the volume-button, watch and ring chanting modes (D-006).
- Nothing is wired into the site or its deploys yet.
```

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git add CHANGELOG.md
git commit -m "docs: changelog for JapaDhyan's domain logic and catalog"
```

- [ ] **Step 2: Wait for the docs pull request.** Continue once the Phase A pull request is merged (`gh pr list --repo shashesh/sagevani --state merged --head docs/japadhyan-move`).

- [ ] **Step 3: Rebase onto `main`, push, open**

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani-japa
git fetch origin
FIRST=$(git log --format=%H --grep="^chore: add JapaDhyan's dependencies$" feat/japa-domain-and-catalog)
git rebase --onto origin/main "$FIRST^" feat/japa-domain-and-catalog
git log --oneline origin/main..feat/japa-domain-and-catalog
cd website && npm ci && npm run lint && npm run typecheck && npm run test:unit && cd ..
git push -u origin feat/japa-domain-and-catalog
gh pr create --base main --head feat/japa-domain-and-catalog \
  --title "feat: JapaDhyan's domain logic and catalog in the website" \
  --body "Part 1 of website/docs/specs/2026-10-06-japadhyan-in-sagevani-design.md, Phase B of website/docs/plans/2026-10-06-japadhyan-move.md: src/japa/domain, the catalog and its content build, with tests. A development build matches the old repository byte for byte. Nothing is wired into the site or its deploys."
gh pr edit --add-reviewer @copilot
gh pr checks --watch
```

Expected: the log shows only Phase B's commits, the local checks pass, and CI passes.

- [ ] **Step 4: [OWNER] Review and merge.**

---

## Phase C — Retire the old repository and its services

### Task 18: Point the JapaDhyan repository here

Do this after the Phase A pull request is merged, so its links work.

**Files (in the JapaDhyan repository):**
- Modify: `README.md`, `CLAUDE.md`

- [ ] **Step 1: Branch**

```bash
cd /c/Users/shash/Documents/personal-github-repos/japadhyan
git fetch origin
git switch -c docs/moved-to-sagevani origin/master
```

- [ ] **Step 2: Replace `README.md` with exactly this**

```markdown
# JapaDhyan (archived)

JapaDhyan, a naam japam app for Hindu, Sikh, Buddhist and Jain practice, now lives in [SageVani](https://github.com/shashesh/sagevani) as the website's `/japa` section, for desktop and mobile browsers. Its documents are in [`website/docs/japa/`](https://github.com/shashesh/sagevani/tree/main/website/docs/japa), and the reasons are in [D-006](https://github.com/shashesh/sagevani/blob/main/docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa).

This repository is read-only. It keeps the history of the React Native and PowerSync version: the Expo app, the PowerSync client and sync lab, the Supabase schema and merge function with their pgTAP tests, and the decisions and plans that were dropped. SageVani's sync design (part 3) and its `/japa` screens (part 4) use them as a reference.
```

- [ ] **Step 3: In `CLAUDE.md`, put this directly under the `# CLAUDE.md` heading**, after its blank line, so the heading stays the first line markdownlint expects:

```markdown
> **Archived.** JapaDhyan now lives in SageVani (`shashesh/sagevani`, `website/docs/japa/`). Do not build features here.

```

- [ ] **Step 4: Format, lint, commit, push, open a draft pull request** (this repository's rules)

```bash
cd /c/Users/shash/Documents/personal-github-repos/japadhyan
npm run format
npm run lint:md
git add README.md CLAUDE.md
git commit -F - <<'EOF'
docs: JapaDhyan moved to SageVani; this repository is archived

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push -u origin docs/moved-to-sagevani
gh pr create --draft --base master --head docs/moved-to-sagevani \
  --title "docs: JapaDhyan moved to SageVani" \
  --body-file - <<'EOF'
## What

The README and CLAUDE.md say JapaDhyan now lives in SageVani as its /japa section, and that this repository is archived.

## Why

D-006 in SageVani: https://github.com/shashesh/sagevani/blob/main/docs/governance/decisions.md

## Checks

- [x] `npm run lint:md` passes
- [ ] Copilot review requested; every comment resolved before the PR is marked ready

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
gh pr edit --add-reviewer @copilot
```

If the `npm run format` step changes files other than these two, discard those changes (`git checkout -- <file>`) before committing.

- [ ] **Step 5: [OWNER] Mark ready, merge, then archive the repository**

```bash
gh repo archive shashesh/japadhyan --yes
```

Only with the owner's explicit go-ahead. Archiving makes the repository read-only for everyone.

### Task 19: [OWNER] Shut down the hosted services

Each step can't be undone. Ask the owner before each one, and let them do it in the dashboard.

- [ ] **Step 1: PowerSync Cloud.** Delete instance `6ab6d2198453e7cf833a0f33` (project `6ab6d2186860dd0007977c8e`, organisation `6ab6d20588083500079d21a7`), as recorded in `powersync/cloud/cli.yaml` of the JapaDhyan repository.

- [ ] **Step 2: JapaDhyan's Supabase project.** Its reference is `rjyddnubeqwrjbaystow` (`powersync/cloud/service.yaml`). First confirm it is not one of SageVani's projects: compare it with the project references in this repository's `website/docs/environments.md` setup and the Netlify variables. Then the owner deletes it under Project settings → General.

- [ ] **Step 3: Optional.** The owner may delete the local Android build folder `C:\jd` and any Android emulator images made for JapaDhyan.

### Task 20: Tidy up

- [ ] **Step 1:** After both pull requests in this repository are merged, remove the worktree from the main checkout. Don't touch that checkout's branches or files.

```bash
cd /c/Users/shash/Documents/personal-github-repos/Sagevani
git worktree remove ../Sagevani-japa
```

- [ ] **Step 2 (main session only, not a subagent):** Update the assistant's memory notes:
  - JapaDhyan lives in SageVani.
  - The JapaDhyan repository is archived.
  - Drop the Android, Maestro and `C:\jd` tooling note.
  - Record that SageVani pull requests are ordinary pull requests, reviewed by Copilot and squash-merged by the owner.

---

## Self-review against the spec

| Spec section | Where |
| --- | --- |
| 4.1 unchanged rules | Task 9 Step 5 (`AGENTS.md`), Task 2 |
| 4.2 dropped features | Tasks 5, 6, 14 |
| 4.3 changed features | Tasks 2, 4, 5 |
| 4.4 analytics, headers, accounts, pack cookies | Task 9 Step 6, Task 4 Step 6, Task 3 Step 5 |
| 5 layout, 5.1 rules, 5.2 dependencies, 5.3 not wired | Tasks 11, 12, 15, 16 |
| 6 what is dropped | Task 1 (documents), Task 12 (`rows.ts`), Task 13 (signing), Task 16 (sandbox and command-line launcher not copied) |
| 7 documents carried across | Tasks 1–8 |
| 8.1 docs pull request | Tasks 9, 10 |
| 8.2 code pull request, 8.3 verification | Tasks 16 (Steps 8–10), 17 |
| 9 old repository and hosted services | Tasks 18, 19 |
| 10 risks | Task 9 Step 8 (numbering), Task 10 Step 2 and Task 17 Step 3 (stage 1 and rebases), Task 12 Step 8 (TypeScript 5.7) |
