# Working on SageVani

Read `README.md`, `docs/project-brief.md`, and relevant foundation sections before work. Check the decision log and open questions for confirmed choices and unresolved issues.

- Use the name SageVani.
- Use the public author byline exactly as `Sagevani`; retain `SageVani` as the project name.
- The owner has final approval. Do not publish externally or apply foundation amendments without that approval.
- Assist with organization, research, writing, editing, code, and maintenance within the requested scope.
- Assistant article drafting may begin without separate approval. Owner approval is required before publication of the specific article version.
- Readers range from novice to advanced. Include a reading difficulty level and suggested prior reading for advanced topics. Level labels and criteria are pending approval.
- Do not invent personal experiences, spiritual conclusions, citations, Sanskrit meanings, or source verification.
- Distinguish text, named traditional interpretation, personal reflection, and practice invitation.
- Treat unapproved revisions and operational conventions as proposals.
- Keep unresolved choices visible and ask when they materially affect the work.
- Article drafts and their editorial reviews live in the website's CMS, not in this workspace (D-005). Seed cards, Vault entries, research, and the foundation stay here, and completed piece worksheets stay in `content/drafts/`. The owner clarified that "private" means unpublished on the website; repository confidentiality was not requested. Do not include drafts or review notes in website pages, feeds, search indexes, sitemaps, downloadable files, or deployment assets.
- Only the owner uses the website's admin panel. The assistant drafts through its API key.
- Website content selection must require explicit owner approval for the exact version; a filename or location alone does not establish approval.
- Privacy rules for standalone personal reflections, Vault entries, and raw research remain undecided.
- Preserve the original handbook. Keep approved revisions traceable.
- Record verified evidence and exact source locations during research. AI output is not a source.
- Do not impose posting quotas, activate dormant series, or select platforms, licenses, and technology without a decision.

## JapaDhyan

JapaDhyan is the naam japam section at `/japa` (D-006). Its documents are in `website/docs/japa/`.

- No account is needed, ever. An account is only for backup and sync, after explicit consent.
- Counting works offline, with no connection and no account.
- Hindu, Sikh, Buddhist and Jain traditions. Every mala, mantra and mode is open from day one; nothing is unlocked by counts or streaks.
- Every chanting mode records count events. Totals are always derived from events, never stored as a counter.
- Count events are sealed, then never edited. Fixes are `correction` events; practice done elsewhere is a `manual` event. Group days by an event's `local_day`, never by converting `created_at`.
- Every practice is an ordered list of steps. Counts are in repetitions: a full namavali is one recitation. A place in a namavali is a position, never a count.
- Catalog content lives in `website/japa-catalog/content/`. Never hard-code mantras or deities in code.
- The owner reviews every practice, and production packs refuse unreviewed ones. Do not invent mantra text, meanings or transliterations.
- Listening japa is counted separately and never added to the chanted total.
- Private guru mantras never store their words, and are excluded from sharing, community and analytics.
- Voice audio never leaves the device.
- Nothing stands between opening `/japa` and chanting: no ads, upsells or articles.
- No leaderboards. Community features are shared goals.
- Google Analytics never records `/japa`.
- `website/src/japa/domain` stays free of React, Next, Payload, Node and browser globals. Its types keep snake_case field names.
