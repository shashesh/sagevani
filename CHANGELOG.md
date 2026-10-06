# Change log

## 2026-10-06 — Drafts in the CMS, admin access, region and database plan

- Recorded [D-005](docs/governance/decisions.md#d-005--drafts-in-the-cms-admin-access-region-and-database-plan):
  - Article drafts and their editorial reviews live in the website's CMS.
  - Only the owner uses the admin panel.
  - The audience is worldwide, and the database sits in Supabase East US (Ohio).
  - Production moves to Supabase Pro when the site is launch-ready.
- Limited the website's admin panel to the owner.
- Updated AGENTS.md, the README, the project brief, the workspace guide, the templates, the spec and the environments guide to match.
- Added a tested manual backup for production until it moves to Pro.
- Added Q-10: where completed piece worksheets live.

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
