# Task list

This Markdown task list is a proposed maintenance method.

## Completed

- [x] Read the complete starting handbook.
- [x] Transcribe all ten sections into Markdown.
- [x] Record owner-confirmed setup decisions.
- [x] Create workspace navigation, templates, and revision proposals.

## Awaiting owner input

- [x] Confirm novice-to-advanced audience and advanced-topic prior readings.
- [x] Confirm that unfinished drafts are private.
- [x] Confirm same-workspace draft storage, with unfinished drafts excluded from the website.
- [ ] Clarify privacy for other personal material.
- [ ] Approve difficulty labels and criteria.
- [x] Confirm byline `Sagevani` and owner approval before publication; assistant may draft without separate permission.
- [ ] Resolve voice and maintenance questions.
- [ ] Review proposed foundation amendments.
- [ ] Decide which workspace conventions to adopt.
- [x] Choose the website platform and design (D-004).
- [x] Review the written [website design spec](../../website/docs/specs/2026-10-05-sagevani-website-design.md).
- [x] Confirm that article drafts are written in the CMS rather than `content/drafts/` (D-005).
- [x] Decide admin access, database region and the Supabase plan (D-005).
- [x] Decide where completed piece worksheets live: `content/drafts/` (D-005).

## Next work after clarification

- [ ] Review Phase 0 exit criteria together; do not mark the phase complete automatically.
- [ ] Capture the first owner-provided seed.
- [ ] Begin Phase 1 unpublished practice when the foundation is ready.

- [x] Plan the first website build stage: [stage 1 plan](../../website/docs/plans/2026-10-05-stage-1-foundation.md).
- [x] Build website stage 1 (foundation): [pull request #1](https://github.com/shashesh/sagevani/pull/1), merged on 2026-10-06.
- [ ] Owner: create the Supabase projects, their `media` buckets and S3 keys, and connect Netlify. See the [environments guide](../../website/docs/environments.md).
- [x] Plan website stage 2 (content model and admin): [design](../../website/docs/specs/2026-10-08-stage-2-content-model-design.md), [plan](../../website/docs/plans/2026-10-08-stage-2-content-model.md).
- [ ] Build website stage 2 (pull request open as a draft).
- [x] Move JapaDhyan's domain logic and catalog into the website (part 1 of D-006), merged on 2026-10-08.
- [ ] Owner: archive the old JapaDhyan repository once its pull request #26 is merged.
- [ ] At launch: upgrade the production Supabase organization to Pro. Until then, back up production drafts by hand (see the environments guide).

The website platform is decided (D-004). Stage 1 (foundation) is merged and awaits the owner's Supabase and Netlify setup. Nothing is deployed or published. No publishing schedule or series commitment has been made.
