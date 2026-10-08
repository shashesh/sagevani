---
status: accepted
date: 2026-09-22
updated: 2026-10-06
---

# Content is authored in the repo and delivered as packs

## Context

The library will grow to many deities, namavalis, stotras, several scripts and languages, audio and images. Text alone stays small (about 7 MB compressed for a large library), but audio could pass 600 MB. Many devotees have phones with little storage and costly data. `/japa` must still work offline after its first visit.

## Decision

- **Source:** text and metadata live in `japa-catalog/content/` as YAML, checked against a schema, reviewed in PRs, with the advisor's sign-off and the licence recorded on each practice. Audio and images live in object storage, not git.
- **Delivery:** a build step generates scripts, then publishes versioned **packs** and a **manifest** as static files with the website. The manifest was signed until 2026-10-06; that was dropped because packs come from the same site as the code that reads them ([D-006](../../../../docs/governance/decisions.md#d-006--japadhyan-joins-sagevani-at-japa)).
- **Device:** a **core pack** is cached by `/japa` on the first visit: the index of every deity and practice, programs, and the full text of every launch deity, so in P1 the only text fetched is the core pack itself, and no request reveals which deity someone chants to. Other packs download when a deity is opened, and automatically for anything saved or starred. Audio is always on demand.

Details: [content-pipeline](../architecture/content-pipeline.md).

## Consequences

- Content fixes ship without a code change.
- The first time a devotee opens a deity outside the core pack, they need a connection once. Browsing and search still work offline.
- Content requests carry no account token or device id. They come from the website's domain, so they carry its first-party cookies until packs move to a path or host that receives none, which happens before per-deity downloads begin. Beyond P1 they are grouped so one request doesn't reveal one deity ([privacy of downloads](../architecture/content-pipeline.md#privacy-of-downloads)).
- The pack format decouples authoring from delivery: a CMS can replace git as the source later without changing the app.
