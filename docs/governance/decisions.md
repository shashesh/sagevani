# Decision log

## D-001 — Initial project decisions

- Date: 2026-10-05
- Status: Confirmed by owner
- Decisions: SageVani spelling; Markdown documentation; full blogging workspace scope; intended public repository; solo ownership; English initially; beginning stage; assistant may assist throughout; final approval belongs to owner.
- Starting source: Foundation Handbook v1.0.
- Pending: Publishing destination and maintenance system. Future regional languages remain tentative.
- Evidence: Owner's numbered answers in the setup conversation.

## D-002 — Audience, privacy, identity, and drafting assistance

- Date: 2026-10-05
- Status: Confirmed by owner; implementation details pending
- Audience: Novice through advanced, with blog difficulty levels and suggested prior readings for advanced topics.
- Privacy: Unfinished drafts are private.
- Identity: Brand byline requested as "Sagevani"; exact capitalization is being clarified against the previously confirmed "SageVani" spelling.
- Assistance: Assistant may draft from owner-provided experiences and reflections, subject to approval. Timing of that approval is pending clarification.
- Implementation: `.gitignore` excludes `content/drafts/` as an interim safeguard. This does not select the permanent storage location or make already-tracked files private.
- Evidence: Owner's four follow-up answers in the setup conversation.
- Refines: D-001. Publishing platform, maintenance conventions, and voice adoption remain undecided.

## D-003 — Draft location, publication approval, and byline

- Date: 2026-10-05
- Status: Confirmed by owner
- Draft location: Same workspace, under `content/drafts/`. Superseded for article drafts by [D-005](#d-005--drafts-in-the-cms-admin-access-region-and-database-plan): they now live in the website's CMS.
- Privacy meaning: Unfinished drafts are not published on the website. The owner did not request repository-level secrecy for drafts.
- Drafting assistance: Assistant may draft without asking first; owner approval is required before publication.
- Public author byline: `Sagevani`, exactly as confirmed. The project name remains `SageVani`.
- Implementation: Removed the temporary draft Git exclusion. Documented website exclusion of unfinished drafts and owner approval of the exact article version.
- Evidence: Owner's answers to the three clarification questions.
- Supersedes: D-002's unresolved draft location, approval timing, and byline capitalization; its temporary Git-exclusion measure no longer applies.
- Remaining: Website platform and hosting, voice adoption, maintenance conventions, difficulty labels, and other open questions.

## D-004 — Website platform and design

- Date: 2026-10-05
- Status: Confirmed by owner. The written spec was approved on 2026-10-05.
- Question: How should the SageVani blog website be built and how should it look?
- Decision:
  - **Platform:**
    - A database-backed blog: articles, comments, likes, statistics, subscribers and article metadata live in a database, not in files in GitHub.
    - Payload CMS 3 inside a Next.js app, with Supabase (Postgres and Storage), hosted on Netlify.
  - **Visual design:**
    - "Manuscript" direction, set in Literata, with an italic wordmark and no dot under it.
    - Warm paper by default, plus a dark mode.
    - A standard blog landing page.
    - Generated typographic covers, replaced by a photo when one is uploaded.
    - Devanagari verse support.
  - **Readers:**
    - New-article email at launch.
    - Comments and likes without reader accounts.
    - Like counts are public; view counts are private.
    - Database statistics plus Google Analytics, with cookie consent.
- Reason: The owner wants all blog data in a database. Payload provides the admin, the custom editor blocks, drafts and version history inside one Next.js app.
- Owner approval: Owner's answers and section-by-section approvals in the 2026-10-05 design session.
- Documents affected: [website design spec](../../website/docs/specs/2026-10-05-sagevani-website-design.md), [website README](../../website/README.md), project brief, open questions.
- Supersedes:
  - A static Astro site built from Markdown, chosen earlier in the same session but never recorded here.
  - Q-08's platform and hosting question.
- Repository visibility: The owner plans to make this GitHub repository private once the website is live.
- Earlier repositories:
  - The 2025 `shashesh/sagevani` (Payload website template on MongoDB) and `shashesh/sagevani-api` repositories are superseded.
  - The owner will delete the old `sagevani` repository, and this workspace takes the name `sagevani` on GitHub.
  - No content is migrated from the old site.
- Pending:
  - Whether article drafts move from `content/drafts/` into the CMS (spec section 18, item 2).
  - Difficulty labels (Q-01).
  - Domain, database region and sender address.
  - Acceptance of the Supabase paid-plan cost.
- Update: [D-005](#d-005--drafts-in-the-cms-admin-access-region-and-database-plan) settled the draft location, the database region and the paid plan.

## D-005 — Drafts in the CMS, admin access, region and database plan

- Date: 2026-10-06
- Status: Confirmed by owner
- Decisions:
  - **Article drafts live in the CMS.**
    - Article drafts are written in the website's CMS, not in this repository. Their editorial review lives there too, as the article's admin-only editorial checklist.
    - Seed cards, Vault entries, research and the foundation stay in this repository.
    - The website still never shows unpublished drafts or review notes, and only the owner publishes.
  - **Only the owner uses the admin panel.** SageVani is a solo project. The assistant role remains so that an AI assistant can draft through its API key (D-003), but it cannot open the admin panel.
  - **The audience is worldwide.** There is no reader region.
  - **Supabase Pro when the site is launch-ready.** Production stays on the free plan until then. Staging stays on the free plan.
- Consequences (assistant recommendations that follow from the decisions; the owner may change them):
  - **Database region.** A Supabase project still needs one region. Both projects go in East US (Ohio). Netlify runs the site's server code in US East (Ohio) by default, and only paid Netlify plans can move it. Every page render queries the database, so the database sits next to that code. Readers worldwide are served through Netlify's global network.
  - **Separate organizations.** Supabase plans apply to a whole organization, and an organization can't mix paid and free projects. So production goes in its own organization, and upgrading it at launch leaves staging free.
  - **Until production is on Pro:**
    - Free projects pause after a week without activity. You can resume them from the dashboard.
    - Free projects have no automatic backups. Drafts written in production need the manual backup in the [environments guide](../../website/docs/environments.md#until-production-is-on-pro).
- Evidence: Owner's answers on 2026-10-06 in the website build session.
- Supersedes:
  - D-003's draft location (`content/drafts/`) for article drafts and their reviews.
  - D-004's pending draft-location, region and paid-plan items.
  - Spec section 18, items 2, 6 (the region) and 7.
- Pending:
  - Where completed piece worksheets live (Q-10). They contain unfinished writing and owner-supplied reflections, so they could go in the CMS or stay in this repository.
  - Domain and sender address.
  - Difficulty labels (Q-01).

## New decision template

- ID and title:
- Date:
- Status: Proposed / Confirmed / Superseded
- Question:
- Decision:
- Reason:
- Owner approval:
- Documents affected:
- Supersedes:
