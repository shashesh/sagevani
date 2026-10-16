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
- [x] Build website stage 2 (content model and admin): [pull request #13](https://github.com/shashesh/sagevani/pull/13), merged on 2026-10-11.
- [x] Plan website stage 3 (the public site): [design](../../website/docs/specs/2026-10-11-stage-3-public-site-design.md), [3a plan](../../website/docs/plans/2026-10-11-stage-3a-reading-experience.md).
- [x] Build website stage 3a (the reading experience): [pull request #14](https://github.com/shashesh/sagevani/pull/14), merged on 2026-10-13.
- [ ] Owner: set `SITE_URL` in Netlify for production and previews (environments guide) before stage 3a merges.
- [ ] Build website stage 3b (the rest of the site: landing, archive, topic, Start here and fixed pages, `/corrections`, the 404 and error pages, link-preview images, the About field and reserved page slugs). Built and tested; the pull request is not yet open.
- [ ] Owner: apply the `20261013_124323_stage_3b_about_text` migration to staging before the stage 3b deploy preview builds (environments guide, section 3).
- [ ] Owner: review and approve, or rewrite, the placeholder interface copy listed in section 9 of the [stage 3 design](../../website/docs/specs/2026-10-11-stage-3-public-site-design.md).
- [ ] Owner: on the stage 3b deploy preview, check that `/og/[slug]` draws its text in the real Literata font, not a silently substituted system font. This is a known risk: `outputFileTracingIncludes` in `next.config.ts` takes effect only under `next build --webpack`, not under this Next version's Turbopack build.
- [ ] Owner: on the stage 3b deploy preview, check that the deploy log shows `@netlify/plugin-nextjs` 5.16.2 or later (environments guide, step 6).
- [ ] Owner: under `next start` with the database stopped, check that the error page shows in the site's design with no stack trace. This can't be automated in CI.
- [x] Move JapaDhyan's domain logic and catalog into the website (part 1 of D-006), merged on 2026-10-08.
- [ ] Owner: archive the old JapaDhyan repository once its pull request #26 is merged.
- [ ] At launch: upgrade the production Supabase organization to Pro. Until then, back up production drafts by hand (see the environments guide).

The website platform is decided (D-004). Stages 1, 2 and 3a are merged, and stage 3b is built with its pull request still to open. The site awaits the owner's Supabase and Netlify setup. Nothing is deployed or published. No publishing schedule or series commitment has been made.
