# JapaDhyan in SageVani — design spec

- Date: 2026-10-06
- Status: Approved by the owner section by section on 2026-10-06; the written spec awaits the owner's review
- Scope: part 1 of 4 — moving JapaDhyan into SageVani as a browser-only section at `/japa`
- Decision record: D-006 (added with this move)
- Source: the [japadhyan repository](https://github.com/shashesh/japadhyan), archived once the move is done

## 1. Summary

JapaDhyan is a naam japam (name chanting) app for Hindu, Sikh, Buddhist and Jain practice. It was planned as a React Native app for iOS, Android and the web, syncing through PowerSync. It now becomes a section of the SageVani website at `/japa`, used in desktop and mobile browsers, with no native apps.

The section lives inside SageVani's Next.js app, deploys with it, and uses the same Supabase project. It keeps JapaDhyan's offline-first design: a devotee can chant with no connection and no account. PowerSync is replaced by sync we write ourselves.

This spec covers part 1: what JapaDhyan becomes, what moves into this repository and where, what is dropped, and the order of work. Parts 2–4 each get their own spec.

## 2. Confirmed decisions

All of these were confirmed by the owner in the 2026-10-06 design session.

| Area | Decision |
| --- | --- |
| Platforms | Browsers only, desktop and mobile. `/japa` can be installed to the home screen. No iOS, Android or watch apps, and no store listings |
| Place | A section of SageVani's Next.js app at `/japa`: one deploy, one Supabase project, the same design |
| Name | JapaDhyan, shown under that name in SageVani's navigation |
| Data | Stored in the browser and usable offline, with an optional account and our own sync to Supabase. PowerSync is removed |
| Catalog | Traditions, deities and practices stay as YAML in the repository. The content build moves as it is, without content signing |
| Order | Move now. The offline spike can run at any time. The `/japa` screens are built after SageVani's stage 3. The blog launches on its own plan |
| Articles | JapaDhyan's articles are ordinary SageVani articles, written in Payload |
| Analytics | Google Analytics never records `/japa` |

## 3. The four parts

1. **The move** (this spec): record the decision, move what is kept into this repository, drop the rest, archive the old repository.
2. **Offline spike:** prove that `/japa` works offline inside SageVani's Next.js app on Netlify, Safari included. If it fails, JapaDhyan becomes a second app served under the same domain through a Netlify rewrite.
3. **Our own sync:** browser storage, sign-in, upload and download, the server schema, consent, deletion, export and import, and reminders.
4. **Building `/japa`:** a new Phase 1 plan, on top of stage 3's design tokens, fonts and layout.

## 4. What JapaDhyan becomes

### 4.1 Unchanged

These product rules carry over as they are:

- No account is needed, ever. An account is only for backup and sync, after explicit consent.
- Counting works offline.
- One count, many inputs: every chanting mode adds to the same total.
- Count events are sealed and never edited. Totals are always derived from events.
- Every practice is an ordered list of steps. A full namavali is one recitation.
- Private guru mantras never store their words.
- Voice audio never leaves the device.
- Nothing stands between opening `/japa` and chanting: no ads, upsells or articles.
- Shared goals instead of leaderboards.
- Hindu, Sikh, Buddhist and Jain traditions. Every mala, mantra and mode is open from day one.
- The owner reviews every practice before it reaches production.

### 4.2 Dropped

A browser cannot do these, so they leave the product:

- Volume-button counting.
- Flip face down to pause.
- Apple Watch and Wear OS apps.
- Bluetooth japa rings and smart malas. Web Bluetooth is not available in Safari or Firefox.

`ChantMode` loses `volume_button`, `watch` and `ring`. Nothing has shipped, so there is no data to migrate.

### 4.3 Changed

| Feature | On the web |
| --- | --- |
| Haptics | Vibration works only in Android browsers. iPhone Safari has none, so the meru bead also gets a visual cue and an optional bell everywhere |
| Screen stays on | The Screen Wake Lock API |
| Reminders | Browsers can't schedule local notifications, so reminders need web push sent from a server. On iPhone, push works only once `/japa` is on the home screen. Designed in part 3 |
| Voice counting (Phase 2) | Still on the device: the browser's microphone and a model that runs in the browser. The voice-counting spike still applies, now in a browser |
| Core content | The service worker caches the core pack ahead of time, instead of it shipping inside an app |
| Starter articles | Written as SageVani articles and linked from `/japa`. JapaDhyan has no article system of its own |

### 4.4 Sharing a site with the blog

- **Analytics:** Google Analytics must never record a `/japa` page, even after a reader has accepted cookies on the blog and moves to `/japa` without a full page load. Which practice someone chants is religious data.
- **Security headers:** `/japa` will need WebAssembly and service-worker allowances in the Content Security Policy. Part 2 settles them.
- **Accounts:** D-004 has no reader accounts at launch. That still holds for the blog. JapaDhyan's optional account is designed in part 3, and the owner decides then how it relates to the blog.
- **Pack downloads:** packs come from the same site as the blog, so their requests carry the site's first-party cookies, such as the like id and the comment token. In Phase 1 only the whole core pack is fetched, so no request names a deity. Before per-deity downloads begin, packs move to a path or host that receives no cookies.

## 5. What moves, and where

Files are copied, not imported with their git history. This repository's history stays clean, and the archived JapaDhyan repository keeps the old history.

```text
website/
  docs/japa/                 JapaDhyan's docs: product, architecture, decisions, research
  japa-catalog/
    content/                 the catalog as YAML (was content/)
    snapshot/                the reviewed snapshot (was content-snapshot/)
  src/japa/domain/           types, Zod schemas and pure logic (was packages/shared)
  src/japa/catalog-build/    the content build's library (was tools/content-build/src)
  scripts/japa-content-*.ts  the content build's two commands
  tests/unit/japa/           the tests, renamed *.unit.spec.ts
```

This follows the website's existing pattern: library code in `src/`, command-line entry points in `scripts/`, tests in `tests/unit/`.

### 5.1 Rules

- `src/japa/domain` stays pure. An ESLint rule blocks imports of React, Next, Payload and Node from it, and the browser's globals.
- Prettier skips `japa-catalog/`, so the catalog keeps the owner's formatting and the snapshot keeps the build's exact bytes.
- Test coverage includes `src/japa/**`, at the existing 80% floor.
- `AGENTS.md` gains a JapaDhyan section with the rules in section 4.1, plus: catalog content lives in `japa-catalog/content/`, never hard-coded; group days by an event's `local_day`, never by converting `created_at`; listening japa is counted separately and never added to the chanted total.
- Shared types keep snake_case field names.

### 5.2 Dependencies

- Added to `website/`: `@noble/hashes`, `yaml` and `@siva-sh/vidyut`, at the versions JapaDhyan pins today.
- Already present: `zod` 4.6.5 and `tsx`.
- This repository uses TypeScript 5.7; JapaDhyan was written against 6.0. The moved code is adjusted where needed. SageVani's TypeScript version is not changed by this move.

### 5.3 Not wired into deploys yet

The content build and its tests run in this repository's checks, through `japa:content:validate` and `japa:content:build`. Packs are not built on deploy until part 4: a production build refuses to run while any practice is unreviewed, and all five development mantras are unreviewed.

## 6. What is dropped

All of this stays in the archived JapaDhyan repository and is not copied here.

- **Code**
  - The Expo app, including the PowerSync client, the sync lab and the chant screen. Part 4 rebuilds the chant screen for the browser, using the old one as a reference.
  - `powersync/`, `tools/sync-lab` and the `sync:*` scripts.
  - `supabase/`: the schema, the position merge function and their pgTAP tests. Part 3 decides what to rebuild from them.
  - `rows.ts` in the shared package: the PowerSync row codecs. Only dropped code uses it. The hybrid logical clock, derived ids, marks, clock offset and position merge all move, because our own sync needs them.
- **Content signing:** the signing script, the keys, the manifest's signature, and the build's sandbox, which existed mostly because of signing. Packs are served from the same site as the code that reads them, so a signature adds no protection.
- **Repository tooling:** git hooks, the CI workflow, the markdownlint configuration, `TECH-VERSIONS.md` and `CLAUDE.md`. This repository has its own.
- **Docs**
  - Decisions: tech stack (React Native and Expo), sync engine (PowerSync), CI only when ready, and the app name and its domains.
  - Plans: the S4 sync prototype and the Phase 1 plan. Part 4 writes a new plan from the Phase 1 plan's unfinished items.
  - The setup guide, the monorepo structure and the store listing.
  - Wearables and hardware: every feature in it is dropped.

## 7. Docs carried across

Into `website/docs/japa/`, with an index of their own. They are cleaned of native and PowerSync statements, not redesigned.

- **Product:** vision, roadmap, glossary, open questions, the research note, and the 13 remaining feature specs.
- **Architecture**
  - The data model. Its storage and sync half shrinks to the requirements our own sync must meet: the conflict rule, derived ids, the position merge and the server's limits. The sync engine and browser storage are marked as decided in part 3.
  - The content pipeline, without signing, the sandbox or a bundled core. Packs become static files from the site, cached by the service worker.
  - Platform principles, rewritten for the web.
- **Decisions:** the 13 that still hold. Content packs loses the core bundled in the app. Guest-first accounts leaves its sign-in methods to part 3.

## 8. Order of work

Stage 1 (pull request #1) records D-005 and edits most of the documents this move touches, and `website/` has no application on `main` until it merges. So both pull requests below are written now, on branches stacked on stage 1's branch, and opened against `main` once stage 1 merges. Stage 1 is squash-merged, so each branch is first rebased onto the new `main`.

### 8.1 Docs pull request

- D-006 in [the decision log](../../../docs/governance/decisions.md).
- `website/docs/japa/`, as in section 7.
- **Updates to existing docs**
  - The project brief: scope includes JapaDhyan.
  - [The website design spec](2026-10-05-sagevani-website-design.md): a short `/japa` section, carrying the analytics rule and the accounts note in section 4.4.
  - Open questions: sign-in for JapaDhyan (Supabase Auth or Payload), and web-push reminders.
  - `AGENTS.md`, as in section 5.1.
  - The changelog.

### 8.2 Code pull request

Stacked on the docs pull request.

- `src/japa/domain` and its tests.
- `japa-catalog/`, `src/japa/catalog-build/` and the two scripts, with signing removed from the build.
- The new dependencies, the ESLint purity rule, coverage and the two `japa:content:*` scripts.

### 8.3 Verification of the code pull request

- Lint, type checks and unit tests pass, with coverage at or above 80%.
- `japa:content:validate` passes on the moved catalog.
- A development build in the new location writes a reviewed snapshot byte-for-byte identical to the old repository's. The build is reproducible, so any difference is a bug in the move. Packs match too, apart from the manifest fields removed with signing.

## 9. The old repository and hosted services

- **The JapaDhyan repository:** one last pull request changes its README to say JapaDhyan now lives in SageVani at `/japa` and links to `website/docs/japa/`. The owner merges it and archives the repository on GitHub. Its code is not stripped first: it is the reference for parts 3 and 4.
- **Hosted services:** these can't be undone, so the owner confirms each before it is shut down.
  - The PowerSync Cloud instance.
  - JapaDhyan's own Supabase project. Its project reference is checked first, so it can't be confused with SageVani's.
  - Optionally, the local Android build folder `C:\jd`.

## 10. Risks and open items

1. **Offline inside Next.js is unproven.** Moving between `/japa` pages offline needs their page data cached, not only their HTML. Part 2 proves it, Safari included, before any `/japa` screen is built. The fallback is a second app under the same domain.
2. **Stage 1 gates both pull requests.** If stage 1 changes before it merges, the stacked branches are rebased onto it.
3. **TypeScript 5.7 against 6.0.** The moved code may need small changes. They are found by the type check in section 8.2.
4. **iPhone limits.** No vibration, and push reminders only for a home-screen install. These shape parts 3 and 4.
5. **Accounts and the blog.** D-004 has no reader accounts and no social login at launch. Part 3 brings JapaDhyan's sign-in to the owner as its own decision.
6. **Database region.** D-005 puts the database in East US (Ohio), next to the site's server code. Part 3 confirms that suits devotees' data too.
