---
status: active
updated: 2026-10-06
---

# Open questions

Decisions still to make. When one is settled, record it in `decisions/` and remove it here.

## Languages at launch

The audience is open to everyone ([decision](../decisions/2026-09-21-open-audience.md)). Which UI and content languages ship in P1? Candidates: English, Hindi, Nepali, then Tamil, Telugu, Gujarati, Bengali, Marathi, Punjabi (Gurmukhi)…

## Pricing

What stays free forever (core chanting, at minimum) and what is premium. See [partners-and-revenue](features/partners-and-revenue.md).

## Content sourcing

Who records pronunciation audio and writes/reviews articles for each tradition, and under what licence.

## Account age policy

Proposed: accounts for 18+ in India (DPDP Act) and 16+ elsewhere, confirmed by the user; younger devotees use guest mode. Needs a lawyer's confirmation before launch. See [accounts-and-sync](features/accounts-and-sync.md#age-p1-needs-legal-review).

## Sync engine

Our own sync against Supabase ([D-006](../../../../docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa)), designed in part 3: browser storage, sign-in (Q-11 in [SageVani's open questions](../../../../docs/governance/open-questions.md)), upload and download, against the [requirements in data-model](../architecture/data-model.md#sync-engine). PowerSync was accepted first and dropped with the native apps.

## Content hosting

Packs are static files served with the website. Where audio is hosted is decided when audio arrives: Supabase Storage, which the website already uses, or Cloudflare R2 ([content-pipeline](../architecture/content-pipeline.md)).

The transliteration library, once part of this question, is decided: vidyut-lipi ([decision](../decisions/2026-09-23-transliteration-library.md)), with our own rules and a hand-written override for `latin`.

## Corrections to listening japa (P2)

Listening japa is counted separately and never added to the chanted total, but
a `correction` event carries `mode: 'correction'`, not the mode it adjusts. If
one session ever held both chanted and listening counts, a correction meant for
the listening total would be subtracted from the chanted one: 10 chanted + 100
listened + a −100 correction would report 0 chanted instead of 10.

Two ways out, to decide when listening japa is built in P2:

- **A session never mixes listening with chanted modes**, so a correction can
  only mean the total its session holds. Simplest, and it fits "one count, many
  inputs" — listening is the one input that isn't part of that count.
- **A correction names what it adjusts**, with a target field on the event.
  More flexible, one more field on an append-only record that is never edited.

P1 is unaffected: listening japa is P2, so no session can hold both today.
See [data-model](../architecture/data-model.md#counting).
