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
