# Workspace guide

This is a proposed working structure, created from the handbook and confirmed scope. Review its maintenance conventions before treating them as permanent.

| Location | Purpose |
| --- | --- |
| `docs/foundation/` | Handbook sections |
| `docs/governance/` | Decisions, questions, revision proposals |
| `docs/operations/` | Tasks and operational notes |
| `vault/` | Questions, seeds, passages, stories, terms, frictions, experiences, dormant series |
| `research/` | Source cards and research logs |
| `content/drafts/` | Completed piece worksheets; excluded from the website. Article drafts live in the website's CMS (D-005) |
| `content/published/` | Approved published article copies |
| `content/publication-records/` | URLs, dates, versions, and corrections |
| `templates/` | Reusable Markdown starting points |
| `website/` | Future website code and design documentation |
| `assets/` | Images, audio, branding, and provenance records |

## Begin a piece

1. Copy the seed template into the appropriate Vault section and capture your own noticing.
2. Sit with the question before researching, following the handbook workflow.
3. Use source and story cards in `research/` as evidence develops.
4. When the seed earns a draft, copy the piece worksheet into `content/drafts/` and write the draft itself in the website's CMS. The article editor arrives in website build stage 2. Assistant drafting may begin without separate permission.
5. Add the piece's difficulty and suggested prior readings for advanced topics. Complete the article's editorial checklist in the CMS and record unresolved claims.
6. Request the owner's final approval before publication. A completed checklist is not approval.
7. Once actually published, store the published copy and publication record. Record later material corrections.

Use descriptive filenames and relative links. Naming and metadata conventions are proposals pending owner feedback. Dates belong on actual events; planned publication dates should remain blank until chosen.

## Public workspace

Article drafts and their editorial reviews live in the website's CMS (D-005). The owner's privacy requirement is that they must not appear on the website. Anything kept in this public repository is readable here.

The website must select only owner-approved article versions. Drafts and review records must be excluded from pages, feeds, search indexes, sitemaps, downloadable files, and deployment assets. Saving a draft is not publication approval. See [website requirements](../website/README.md).

The boundary for standalone personal reflections, Vault entries, and raw research is unresolved. Keep unfinished article text and review notes in the CMS to make website exclusion straightforward. Do not copy confidential material or full copyrighted source works into this workspace. Link to sources and record permitted excerpts with attribution.

Website build stage 1 (foundation) is in [pull request #1](https://github.com/shashesh/sagevani/pull/1). Hosting and external publication have not been performed.
