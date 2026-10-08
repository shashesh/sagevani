# Change log

## 2026-10-08 — Default branch renamed to `master`

- Renamed the repository's default branch from `main` to `master` at the owner's request. GitHub redirects old `main` links.
- Website CI now runs on pushes to `master`. The environments guide and the website design spec say `master`, so importing the site makes Netlify deploy `master` to production.
- The JapaDhyan move plan's remaining steps now target `master`, open draft pull requests, and leave the Copilot review to the owner.

## 2026-10-06 — JapaDhyan's domain logic and catalog

- Moved JapaDhyan's types, schemas and pure logic into `website/src/japa/domain`, with their tests, under the 80% coverage floor. A lint rule keeps it free of React, Next, Payload, Node and browser globals.
- Moved the catalog to `website/japa-catalog/` and its content build to `website/src/japa/catalog-build`, run with `npm run japa:content:validate` and `npm run japa:content:build`. A development build in the new place matches the old repository's byte for byte.
- Dropped content signing, the PowerSync row codecs, and the volume-button, watch and ring chanting modes (D-006).
- Nothing is wired into the site or its deploys yet.

## 2026-10-06 — JapaDhyan joins the website

- Recorded [D-006](docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa): JapaDhyan, the owner's naam japam app, becomes the website's `/japa` section, for browsers only, with its own offline storage and sync.
- Added the [design spec](website/docs/specs/2026-10-06-japadhyan-in-sagevani-design.md), the [move plan](website/docs/plans/2026-10-06-japadhyan-move.md), and JapaDhyan's documents in [`website/docs/japa/`](website/docs/japa/README.md).
- Added Q-11 (sign-in for JapaDhyan) and Q-12 (web-push reminders). Updated the project brief, the website design spec, `AGENTS.md` and the README.
- No JapaDhyan code is in the website yet.

## 2026-10-06 — Website stage 1 merged

- The owner merged [pull request #1](https://github.com/shashesh/sagevani/pull/1) into `main`. Nothing is deployed yet.
- Updated the [environments guide](website/docs/environments.md) for the merge-first order. Importing the site into Netlify now deploys `main` to production straight away, so Supabase and the variables come first. Staging is checked through the next pull request's preview.

## 2026-10-06 — Drafts in the CMS, admin access, region and database plan

- Recorded [D-005](docs/governance/decisions.md#d-005--drafts-in-the-cms-admin-access-region-and-database-plan):
  - Article drafts and their editorial reviews live in the website's CMS.
  - Only the owner uses the admin panel.
  - The audience is worldwide, and the database sits in Supabase East US (Ohio).
  - Production moves to Supabase Pro when the site is launch-ready.
- Limited the website's admin panel to the owner.
- Updated AGENTS.md, the README, the project brief, the workspace guide, the templates, the spec and the environments guide to match.
- Added a tested manual backup for production until it moves to Pro.
- Resolved Q-10: completed piece worksheets stay in `content/drafts/` in this repository.

## 2026-10-06 — Website stage 1: foundation

- Built the Payload CMS 3 and Next.js 16 app in `website/`, with owner and assistant roles, login lockout, and a single owner enforced by the database.
- Kept every Payload table in a dedicated `payload` schema, with row-level security and Supabase's web API roles revoked.
- Added the initial migration, production-only migrations on deploy, and TLS verified against Supabase's certificate authority.
- Added the `owner:create` and `owner:reset-password` commands. The owner account can't hold an API key, and GraphQL is turned off.
- Added CI on GitHub Actions, Dependabot, the Netlify settings and the [environments guide](website/docs/environments.md).
- Opened [pull request #1](https://github.com/shashesh/sagevani/pull/1). Supabase, Netlify and the merge await the owner. Nothing is deployed or published.

## 2026-10-05 — Website platform and design

- Recorded D-004: a database-backed blog built with Payload CMS 3 in Next.js, Supabase and Netlify, plus the approved visual design and reader features.
- Added the [website design spec](website/docs/specs/2026-10-05-sagevani-website-design.md) for owner review.
- Resolved Q-08. Updated the project brief, the website README and the task list.
- Recorded that the owner plans to make the repository private once the website is live.
- No website implementation or publication has occurred.

## 2026-10-05 — Draft publication boundary and byline clarified

- Confirmed drafts stay in this workspace and are excluded from the website; removed the temporary draft Git exclusion.
- Confirmed assistant drafting may begin without separate permission and requires owner approval before publication.
- Set public author byline to `Sagevani`; retained `SageVani` as the project name.
- Added future website requirements for selecting approved article versions and excluding draft material from all outputs.
- Resolved draft storage, approval timing, and byline questions; no website implementation or publication occurred.

## 2026-10-05 — Audience and private draft decisions

- Recorded novice-to-advanced readership, difficulty levels, and prior reading guidance for advanced topics.
- Added proposed difficulty criteria and updated editorial templates.
- Recorded that unfinished drafts are private and excluded `content/drafts/` from future Git tracking as an interim safeguard.
- Recorded brand identity and permitted assistant drafting subject to approval; exact byline casing and approval timing remain pending.
- Kept voice, maintenance, and permanent private storage choices unresolved.

## 2026-10-05 — Initial documentation setup

- Preserved the original Word handbook.
- Added Markdown transcriptions of all ten foundation sections.
- Added project decisions, unresolved questions, and proposed amendments.
- Added working directories, navigation, and reusable editorial templates.
- No foundation amendments approved; no content published.
