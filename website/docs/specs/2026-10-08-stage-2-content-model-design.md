# Website stage 2: content model and admin — design

- Date: 2026-10-08
- Status: Design approved by the owner, section by section, on 2026-10-08. Written spec awaiting the owner's review
- Parent spec: [SageVani website design](2026-10-05-sagevani-website-design.md), sections 5, 8 and 16
- Implementation plan: to be written in `../plans/` once this spec is approved
- Scope: stage 2 of the build order. The content collections, the editor blocks, publishing with its rules and approval record, and media storage

## 1. Summary

Stage 2 gives the admin everything needed to write and publish articles: the content collections, the Verse, Tradition and Practice blocks, the publish rules, the approval record and image storage. The owner writes and publishes in the admin. The assistant saves drafts through its API key and can never publish, unpublish or delete. Nothing public is built yet: the public site is stage 3.

## 2. Decisions from the design session

| Question | Decision |
| --- | --- |
| Scope | Content collections only. The reader collections (commenters, comments, likes, articleStats, subscribers, rateLimits) arrive in stage 4 with the endpoints that use them |
| Serving media | A public Supabase bucket with random file names. Payload's media API is staff-only, so nobody can list uploads or read their details |
| Media in development and CI | A gitignored folder on disk. Supabase Storage is required wherever the database isn't local |
| Preview | Built in stage 3, once the article page exists |
| Difficulty levels | An owner-edited collection. A "needs prior reading" checkbox drives the publish rule, so Q-01's outcome needs no code change |
| Starting data | A migration adds the four topics and the three proposed levels, using only text the handbook and spec already fix |
| Assistant and published articles | The assistant may save a draft version of a published article. The live article changes only when the owner publishes it |
| Keeping the assistant to drafts | A server-side guard on Payload's own API. Every refused case is tested through REST with a real assistant API key |

Two additions agreed in the session: `pages` get drafts, and only the owner can tick the editorial checklist.

## 3. Collections

### 3.1 articles

Versions, drafts and autosave are on. Fields are those of the parent spec, section 5.1, with these specifics:

- **Drafts may be incomplete.** Payload doesn't validate drafts, so required fields and the publish rules (section 4.3) apply only when an article is published.
- **difficulty** is a relationship to one `difficultyLevels` item.
- **slug** is generated from the title when empty: diacritics removed, lowercase ASCII words joined by hyphens (`Māyā and the Rope` → `maya-and-the-rope`). It stays editable and must be unique across all articles, drafts included. A clash fails the save with an error that names the slug. Nothing is added automatically.
- **readingTime** counts the words of the body, including the text inside blocks, at 200 words a minute, rounded up, with a minimum of 1.
- **searchText** holds the title, summary and body text, including block text, in lowercase with diacritics removed and whitespace collapsed, so a search for "maya" will find "māyā" once stage 5 builds search.
- **Set by the server only.** No API request can set these:
  - `publishedAt`, on first publish;
  - `approval`: approver, time and version id, on every publish;
  - `emailSentAt` and `emailRecipients`, which exist now and are filled in stage 4.
- **editorialChecklist** is the 17 checkboxes of [`templates/editorial-review.md`](../../../templates/editorial-review.md): 9 under Integrity and 8 under Voice and readiness. Three notes fields follow: unresolved issues, required changes and source records. Only the owner can change it, the assistant can read it, and the public never sees it. It never blocks publishing.
- **Editor blocks:**
  - Verse: Devanagari (optional), transliteration, translation, text name, location, translator or edition.
  - Tradition: school or teacher (required) and the interpretation.
  - Practice: the invitation text.
  - Images: inserted with Payload's upload feature, each linked to a `media` item.

### 3.2 topics

Name, slug, the question the door asks, intro, display order, and cover tint (background and text colour). No drafts.

### 3.3 difficultyLevels

Name (unique), description, display order, and "needs prior reading". No drafts. Owner-edited.

### 3.4 pages

Title, slug (unique, folded like article slugs) and a body with the same editor. Drafts are on, so a half-written page never goes live. Owner only.

### 3.5 media

An upload with alt text, creator, source, and licence or permission, all required, plus optional notes. See section 5 for storage.

### 3.6 siteSettings (global)

The featured article, up to three featured picks, the Start-here list (ordered articles), navigation (label and path), the footer motto and the tagline, which defaults to "Where silence learns to speak."

## 4. Access and publishing

### 4.1 Who can do what

"REST" means `/api/…`. Public pages read through Payload's local API on the server, so the public REST API stays narrow.

| | Public (REST) | Assistant (API key) | Owner |
| --- | --- | --- | --- |
| `articles` | Read published only | Read everything, including drafts and versions. Create and edit as drafts only | Everything |
| `topics`, `difficultyLevels`, `siteSettings` | Read | Read | Edit |
| `pages` | Read published only | Read | Edit and publish |
| `media` | None. Files load from the bucket by their random URL | Read, upload, edit details | Everything |
| Editorial checklist | Never | Read | Read and tick |
| `approval`, email record | Never. The recipient count would reveal the subscriber count, which is owner-only | Read | Read. Only the server writes them |
| `publishedAt` | Read on published articles | Read | Read. Only the server writes it |

The `users` collection is unchanged from stage 1.

### 4.2 The drafts-only guard

The assistant may save drafts: `?draft=true` with any status but published. A draft of a published article is stored as a new draft version, and the live article doesn't change.

Every other assistant write to `articles` is refused with a 403 and the message "The assistant saves drafts only; the owner publishes.":

- saving with `_status: published`;
- an update without `?draft=true`, which on a published article would unpublish it;
- restoring a version (`POST /api/articles/versions/:id`);
- duplicating, bulk updates and deletes.

Payload's collection hooks don't receive the draft flag directly. The REST endpoints read it from the request query. So every refused case gets a failing integration test through the real REST API, with a real assistant key, before the guard is written.

### 4.3 Publishing

Publishing is the owner's approval (parent spec, section 8.3).

- **The publish rules** run whenever the status becomes published. A failure stops the publish with one error that lists every rule that failed:
  - a difficulty level is set;
  - if that level needs prior reading, there is at least one `readFirst` item;
  - a Text / Story Study has at least one source;
  - every image in the body links to a `media` item whose alt text isn't blank.
- **On publish** the server records the approver, the time and the published version's id in `approval`, and sets `publishedAt` the first time.
- **Editing a published article** and publishing again records a new approval.
- **Unpublishing** is owner only. It takes the article off the site and keeps its record and history.

## 5. Media storage

- **Hosted sites:** Supabase Storage, through Payload's S3 storage adapter pointed at Supabase's S3-compatible endpoint. The bucket is public and named `media`, and files load directly from its public URLs.
- **Development and CI:** a gitignored folder on disk.
- **Settings:** the endpoint, region, access key, secret, bucket and public URL are environment variables. They are required whenever the database isn't local, which is the same rule `DATABASE_CA_CERT` follows. Setting only some of them is an error. CI builds against a local database, so it needs none.
- **Random names:** every upload is renamed to a random UUID plus its extension before it is stored.
- **Accepted files:** JPEG, PNG, WebP and AVIF, up to 10 MB. SVG is refused, because it can carry scripts.
- **Processing:** the original is re-encoded with its longest side capped at 2,400 pixels, and its metadata, such as GPS location, is stripped. No other sizes are generated. In stage 3, Next's image optimisation resizes images for each page.
- **What stays hidden:** media REST is staff-only, and Supabase doesn't let anonymous visitors list a public bucket. An image that is only in a draft can be fetched only by someone who already has its URL.

## 6. Starting data

A second migration, after the schema migration, adds the starting data. It skips any row that already exists, and everything stays editable in the admin.

| Topic | Slug | Question (from [the charter](../../../docs/foundation/01-charter.md)) | Order | Background | Text |
| --- | --- | --- | --- | --- | --- |
| Dharma | `dharma` | How shall I live? | 1 | `#e3cfa8` | `#3d2f1c` |
| Adhyātma | `adhyatma` | Who am I? | 2 | `#cfcbc5` | `#2b2a2c` |
| Bhakti | `bhakti` | What is the Divine, and what is my relationship to it? | 3 | `#e5c3b4` | `#4a241a` |
| Sādhanā | `sadhana` | How shall I practice what I understand? | 4 | `#cdd6c2` | `#28331f` |

Topic intros stay empty for the owner to write.

The three levels and their descriptions come from the proposed criteria in [reader guidance](../../../docs/editorial/reader-guidance.md), which await the owner's approval (Q-01):

| Level | Description | Order | Needs prior reading |
| --- | --- | --- | --- |
| Beginner | No prior study assumed | 1 | No |
| Intermediate | Some familiarity with the relevant terms or text | 2 | No |
| Advanced | Familiarity with the texts, schools, or interpretive debates involved | 3 | Yes |

## 7. Database

- One migration generated by Payload creates the new tables, and the starting-data migration follows it.
- The existing hardening step covers the new tables, because it acts on the whole `payload` schema. The existing test that every table is in `payload` and none in `public` covers them too.

## 8. Testing

Coverage stays at 80% or more.

- **Unit tests:**
  - slug folding of IAST diacritics;
  - reading time, and search text from the editor's content, blocks included;
  - each publish rule;
  - finding images in the body;
  - random file names;
  - the storage settings check.
- **Integration tests** against the test Postgres:
  - the access table in section 4.1, role by role;
  - every refused case in section 4.2, through REST with a real assistant key, plus a draft over a published article leaving the live article unchanged;
  - the approval record, and `publishedAt` set once;
  - the publish rules blocking publication;
  - media details hidden from the public;
  - the starting data.
- **End-to-end test (Playwright):** the owner signs in, writes an article with a Verse block and an image, sees the publish rules stop it, fixes it and publishes.

## 9. Not in stage 2

| Item | Where |
| --- | --- |
| Reader collections and endpoints | Stage 4 |
| Draft preview, and refreshing pages on publish | Stage 3 |
| Emailing subscribers | Stage 4 |
| Search page | Stage 5 |
| Image sizes for pages | Stage 3, through Next's image optimisation |

## 10. Documents this stage updates

- **Parent spec:**
  - a link to this spec;
  - difficulty as an owner-edited list;
  - drafts on `pages`;
  - stage 2's reader collections moved to stage 4;
  - preview in stage 3.
- [Environments guide](../environments.md): creating the `media` bucket and its S3 access keys in both Supabase projects, and the new environment variables.
- `CHANGELOG.md` and `docs/operations/tasks.md`.
