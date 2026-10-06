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
- Draft location: Same workspace, under `content/drafts/`.
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
