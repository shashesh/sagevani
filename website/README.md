# Website

Home for the SageVani website code and its design documents. Build stage 1 (foundation) is done: the Payload app, owner and assistant accounts, database hardening, CI and the deploy settings. Nothing is deployed yet.

- **Design:** [website design spec](docs/specs/2026-10-05-sagevani-website-design.md), approved by the owner on 2026-10-05.
- **Build plans:** [stage 1, foundation](docs/plans/2026-10-05-stage-1-foundation.md).
- **Platform** ([D-004](../docs/governance/decisions.md)): Payload CMS 3 inside a Next.js app, with Supabase (Postgres and Storage), hosted on Netlify.
- **Content:** articles and all blog data live in the database, not in files in this repository.
- **Domain:** not yet purchased.

## Confirmed publication requirements

- Publish only article versions the owner has approved. Only the owner role can publish, and publishing records the approved version.
- Use the public author byline `Sagevani`.
- Include difficulty guidance and suggested prior readings for advanced topics. Specific labels remain pending approval.
- Never expose unpublished drafts or editorial review notes in any website output: pages, feeds, search, sitemaps, downloadable files or link previews.
- The website reads only published content from its database. It never reads this repository's workspace folders.

These requirements will be tested once the website exists.

## Develop

The app is a Payload CMS 3 + Next.js 16 project in this folder. See [environments](docs/environments.md) for local setup, variables, and staging/production setup.
