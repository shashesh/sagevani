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

The tech-stack and PowerSync decisions, and the app-name decision's domains, store listings and app identifiers, are superseded by D-006; the name JapaDhyan stays. The CI-only-when-ready decision went with the old repository's tooling. All of them stay in the archived repository.

## Research

- [the Sai app](research/inspiration-sai-nama-japam.md) — the screen that inspired this project
