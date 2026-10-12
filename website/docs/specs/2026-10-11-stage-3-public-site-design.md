# Website stage 3: the public site — design

- Date: 2026-10-11
- Status: Design approved by the owner, section by section, on 2026-10-11. Written spec approved by the owner the same day
- Parent spec: [SageVani website design](2026-10-05-sagevani-website-design.md), sections 4, 6, 7, 12, 13 and 16
- Previous stage: [stage 2 — content model and admin](2026-10-08-stage-2-content-model-design.md), and its plan's notes for stage 3
- Implementation plans: stage 3a and stage 3b, written one at a time
- Scope: stage 3 of the build order. The public pages, their design, draft preview and refreshing pages on publish

## 1. Summary

Stage 3 builds what readers see. It adds the "Manuscript" design tokens, the Literata and Tiro Devanagari Sanskrit fonts, light and dark themes, the header and footer, and every public page except search and the subscription flow. The owner previews a draft beside the editor, in the site's design, before publishing it. Pages are cached and refresh when published content changes.

Readers can't like, comment or subscribe yet: those arrive in stage 4. Until launch, every page asks search engines not to index it.

## 2. Decisions from the design session

| Question | Decision |
| --- | --- |
| Delivery | One spec, two pull requests: 3a (the reading experience) and 3b (the rest of the site). Section 3 |
| The four layers on the page | "Manuscript gloss": the verse centred between two rules, the tradition's reading as an indented gloss under its attribution, the practice invitation as a centred italic coda. Reflection is plain body text |
| Generated cover | Design A, centred: the term large in the middle, the title under it, the SageVani mark in the lower right |
| Draft preview | Payload's live preview: the page sits beside the editor and refreshes on each autosave, plus a button that opens it in its own tab |
| The landing page's About box | A new `aboutText` field in site settings, linked to `/about`. Until it is written, the box shows the tagline |
| Before launch | Hidden from search engines: every page says `noindex`. One environment variable allows indexing at launch |
| Caching | Pages are cached and served from Netlify's network. One cache tag, `site`, covers every public read, and any change to published content clears it |
| Theme toggle | Two states, light and dark. A first visit follows the device setting |
| Dates | Shown as "11 October 2026", in UTC |

Approaches considered for caching and not chosen: refreshing only the paths an article touches (easy to miss a dependent page, and Netlify has an open bug with path patterns), and Next 16's Cache Components (Payload's admin has open bugs with it switched on in these versions, and on Netlify its cache is held separately in each server instance). Cache Components can be revisited once Payload supports them fully.

## 3. Delivery

| Pull request | Contents |
| --- | --- |
| 3a — the reading experience | Design tokens, fonts, themes, header and footer; the public data layer; the article page with its blocks and cover; live preview; refreshing pages on publish; images; the site address and `noindex` |
| 3b — the rest of the site | The landing, archive, topic, Start here, fixed and corrections pages; the 404 and error pages; link-preview images; the `aboutText` field; reserved page slugs |

3a's article page needs only what 3a builds. Until 3b merges, `/` keeps its current placeholder.

## 4. Architecture

### 4.1 Routes

Public routes live in `src/app/(frontend)/`.

| Route | Page | PR |
| --- | --- | --- |
| `/articles/[slug]` | Article (6.1) | 3a |
| `/preview/articles/[id]`, `/preview/pages/[id]` | Live preview, staff only (4.4) | 3a |
| `/local-media/[file]` | Images when storage is off (4.5) | 3a |
| `/` | Landing (6.2) | 3b |
| `/articles` | Archive, filtered and paginated by the query string (6.3) | 3b |
| `/topics/[slug]` | Topic (6.3) | 3b |
| `/start-here` | Start here (6.3) | 3b |
| `/corrections` | Every public correction (6.3) | 3b |
| `/[slug]` | Any other page: About, How SageVani writes, Privacy, and pages added later (6.3) | 3b |
| `/og/[slug]` | Link-preview image (6.5) | 3b |

- **Fixed routes always win over `/[slug]`**, so a page with a fixed route's name could never be shown. The page editor refuses these slugs: `admin`, `api`, `articles`, `topics`, `search`, `corrections`, `subscribe`, `unsubscribe`, `og`, `preview`, `local-media`, `japa`.
- **`start-here` is allowed:** it is the Start here page's own slug, and `/start-here` serves it.
- **Dynamic routes are rendered on their first request**, not during the build, and cached from then on.

### 4.2 Public reads

- **One module reads for every public page:** `src/lib/site/`. No public page or component calls Payload directly. The preview routes (4.4) are the only other readers: they read the latest draft as the signed-in staff user, and are never cached.
- **It reads as an anonymous visitor.** Every call uses the Local API with `overrideAccess: false`, no user, never `draft`, and an explicit `select` and `depth`. The existing access rules then guarantee:
  - only published articles and pages are returned;
  - staff-only fields (the approval record, the editorial checklist, the email record) never appear, including through body links and prior readings;
  - an unpublished entry in site settings, or an unpublished prior reading, comes back as a bare id, and the module drops it.
- **Images are the one deliberate exception.** The `media` collection is staff-only (stage 2 design, 4.1), so an anonymous read can't populate an image. The module collects the image ids that published content references (the cover image and the body's upload nodes) and reads them in one query with `overrideAccess: true`, selecting only `filename`, `prefix`, `alt`, `width` and `height`. It builds each image's address itself, because Payload's own `url` points at the staff-only file route. Nothing else in `media` is ever read for a public page.
- **Links**
  - A body link to an article or page that isn't published renders as plain text, not a link to a 404.
  - Only `http:`, `https:` and `mailto:` addresses and paths on this site become links, in the body, in prior readings and in sources. Anything else, such as `javascript:`, renders as text.

### 4.3 Caching and refresh

- **What is cached**
  - Every public route reads through the cached functions in `src/lib/site/cached.ts`, which carry the tag `site`. The preview routes call the uncached functions directly.
  - Pages are static where they can be and are served from Netlify's network. The archive and topic pages, which read the query string for filters and page numbers, render per request from the cached functions.
- **What refreshes pages:** a change to what the public sees calls `revalidateTag('site', { expire: 0 })`. Every cached page and query then rebuilds on its next request, so the first reload after publishing shows the new version.
  - **Articles and pages:** publishing (including restoring a version without the draft flag), unpublishing, and deleting a published document.
  - **Topics and difficulty levels:** any create, update or delete.
  - **Site settings:** any change.
  - **Media:** the owner's update or delete. An upload alone changes no public page.
- **What never refreshes:** saving a draft, including an autosave on a draft of a published article, which happens every 2 seconds while the owner writes. The live article doesn't change until it is published.
- **Outside a Next request** (command-line scripts, migrations, and tests that call Payload directly) there are no pages to refresh, so the refresh is skipped. Next refuses a refresh there, and also during a render. Payload creates a document during the admin's render when "Create new" opens an autosave collection, and that document is a draft, so it never reaches the refresh.
- **A failed refresh** is logged with context and never undoes the save.
- **The build now reads content**, because static pages are rendered during it. A branch that adds a migration therefore needs it applied to staging before its deploy preview builds (environments guide).
- **Netlify:** the site needs `@netlify/plugin-nextjs` 5.16.2 or later, which fixes prerendered pages inside route groups on Next 16.3.8. Netlify installs the latest version unless one is pinned. The deploy log confirms it.

### 4.4 Live preview

- **Where it lives.** `/preview/articles/[id]` and `/preview/pages/[id]` render the latest draft with the same components as the public pages. They are never cached and always carry `noindex`.
- **Who sees it.** The route checks the request's Payload session. Anyone who isn't the owner or the assistant gets a 404, and the response gives no sign that the document exists.
- **In the admin.** Payload's live preview (`admin.livePreview` on `articles` and `pages`) shows the preview beside the editor at phone, tablet and desktop widths. `@payloadcms/live-preview-react`'s `RefreshRouteOnSave` reloads it after each autosave. A Preview button (`admin.preview`) opens the same URL in a new tab.
- **What it shows.** The page as it would look once published: links and prior readings to unpublished articles appear as they would publicly.
- **Why separate routes.** Public routes never read drafts, so a draft can never reach the cache, and Next's draft mode isn't needed.

### 4.5 Images

- **Hosted sites.** `next/image` resizes images through Netlify's image CDN from the Supabase bucket. `images.remotePatterns` lists the bucket's host, taken from `MEDIA_PUBLIC_URL` at build time.
- **Storage off (local development and CI).** Payload's own file route applies the staff-only read access, so public pages can't load images through it. A small route, `/local-media/[file]`, serves files from the local uploads folder instead.
  - It exists only while storage is off, and answers 404 otherwise. Storage is required wherever the database isn't local, so it never runs on a hosted site.
  - It accepts only the names uploads are given: a random UUID and one of `.jpg`, `.jpeg`, `.png`, `.webp` or `.avif`. Anything else is a 404, so no path can leave the folder.
  - It never lists files.
- **Loading.** The cover on an article page loads first. Every other image is lazy-loaded, with `sizes` matched to its column.

### 4.6 Site address and indexing

- **`SITE_URL`** is the site's address for canonical links, link previews and share links. It is required wherever the database isn't local, like the media variables. Locally it defaults to `http://localhost:3000`. In Netlify it is set for each deploy context.
- **`SITE_INDEXING`.** Until it is set to `on`, every page carries `<meta name="robots" content="noindex">`. `robots.txt` is left to stage 5: a crawler that `robots.txt` turns away never reads the `noindex`, and may still list a page it finds linked elsewhere.
- **Preview routes and the admin** carry `noindex` whatever the setting.

### 4.7 Styling and code layout

- Plain CSS: a global tokens file, `src/styles/tokens.css`, with both themes, plus a CSS Module per component. No styling library is added.
- JapaDhyan's `/japa` (its part 4) reuses the same tokens and fonts.
- Components live in `src/components/`, and the public data layer and its helpers in `src/lib/site/`.

## 5. Visual system

### 5.1 Tokens

- The colours in parent spec 7.1 become CSS custom properties, with a light set and a dark set.
- A unit test computes the contrast of every text pair in both themes and requires at least 4.5:1. That includes the dark values the parent spec marked as proposals. Any that fail are adjusted, and the change is reported to the owner before merging.

### 5.2 Fonts

- **Literata** is served from the site's own domain through `next/font/google`: the variable font with its optical-size and weight axes, normal and italic, `latin` and `latin-ext` subsets.
- **Tiro Devanagari Sanskrit** (weight 400) is declared with the `devanagari` subset only and `preload: false`. The browser downloads it only on a page that contains Devanagari characters.
- **Link-preview images** can't use variable or WOFF2 fonts: the image renderer bundled with Next 16.3.8 (Satori 0.25) doesn't read them. Static Literata TTF files, the italic and the medium weight, are committed to `website/assets/fonts/` with their OFL licence and a note of where they came from.

### 5.3 Theme

- A first visit follows the device's light or dark setting.
- The toggle in the header switches between light and dark, and the choice is stored in the browser.
- A small inline script in `<head>` applies the stored choice before the first paint, so the wrong theme never flashes.
- There is no third "follow the device" state. Clearing the site's data returns to it.
- The toggle is a real button with an accessible name that states the theme it switches to.

### 5.4 Layout, header and footer

- **Widths.** A 1,120 px page and a 680 px reading column, designed for phones first. Test widths: 320, 375, 768, 1024, 1440 and 1920 pixels.
- **Header**
  - The italic wordmark "SageVani", linking home.
  - The navigation links from site settings. With none set, the header shows the wordmark and the toggle.
  - The theme toggle.
  - Under 860 px the links fold into a menu built on `<details>`, so it works without JavaScript.
  - A "Skip to content" link comes first.
- **Reading-progress line.** On article pages, a thin accent line under the header. It moves with `transform` only, has no transition when reduced motion is set, and is hidden from screen readers.
- **Footer.** The ink background, the wordmark, the tagline, the footer motto (hidden while empty) and the navigation links. No licence or copyright line until Q-06 is decided.
- **Motion** is limited to the progress line and hover states.

### 5.5 Covers

- **Drawn in HTML and CSS.** The tint comes from the article's first topic, in the article's own order of topics. An article with no topic uses the "no topic" tint (`#efe6d2` with ink text).
- **Design A.** The term is `coverTerm`, or the title when that's empty, in large italic Literata. The title sits under it in medium weight, and the SageVani mark in the lower right. Sizes scale with the cover's width (container query units), so one design serves the large cover and the list thumbnail.
- **One shape.** Every cover is 1200 × 630, the link-preview shape, so a shared link shows the same cover as the page.
- **Both themes.** The tints are fixed plates and look the same in light and dark.
- **A cover photo** replaces the drawn cover in the same frame, cropped to fill it.

### 5.6 Dates and labels

- **Dates.** "11 October 2026", always in UTC, so a date never shifts with the server's location.
- **Reading time.** "7 min read".
- **Shape.** The shape's label: Vani Note, Inquiry Essay, Text / Story Study or Practice Journal.
- **Difficulty.** The level's name.

## 6. Pages

### 6.1 Article page (3a)

From top to bottom, following parent spec 6.2:

1. **Header**, with the reading-progress line.
2. **Label row:** the article's topics, then its shape, in spaced accent capitals.
3. **Title and summary.**
4. **Byline:** `Sagevani`, the date published, the reading time and the difficulty level.
5. **Cover:** the drawn cover or the cover photo.
6. **Before you read** box, shown when the article has helpful background or at least one prior reading. The publish rules already require a prior reading for a level that needs one.
   - The helpful background.
   - "Suggested prior reading": a SageVani article links by its current title; an item elsewhere shows its title, author and link. Each shows why it helps.
7. **Body**, rendered on the server from Lexical with Payload's JSX converters.
   - **Verse:** centred between two thin rules. The Devanagari, when given, in Tiro Devanagari Sanskrit; the transliteration in italic; the translation; then the text name, location and translator or edition in small muted type. The Devanagari carries `lang="sa-Deva"` and the transliteration `lang="sa-Latn"`.
   - **Tradition:** an indented gloss with a dotted rule, under the line "As [school or teacher] reads it".
   - **Practice:** a centred italic coda under the spaced word "PRACTICE" in the accent colour.
   - **Images:** `next/image` with the image's alt text.
   - **Reflection** is ordinary body text: 19 px with a 1.7 line height.
8. **Share:** copy link, WhatsApp, email and X. Only "Copy link" needs JavaScript; the others are plain links built from `SITE_URL`. The like button joins this row in stage 4.
9. **Sources:** a `<details>` list, open by default, grouped in the handbook's tier order (primary text, commentary, academic, living tradition, general). Each entry shows the work in italic, the author or commentator, the edition or translator, the exact location, the link and its access date, and the claim it supports. This format is a proposal until Q-07 (the citation format readers see) is decided. Only the sources component would change.
10. **Correction notes:** each correction marked "show a public note", newest first, with its date, what changed and a link to `/corrections`. The link arrives in 3b with that page, so 3a never links to a missing page.
11. **More from [topic]:** up to three other published articles from the article's first topic, newest first, as cards. Hidden when there are none or the article has no topic.
12. **Footer.**

Comments (parent spec 6.2, item 9) arrive in stage 4, between the correction notes and More from.

- **Not found.** An unknown slug, or an unpublished article, returns the site's 404.
- **Metadata.** The title and description are `seo.title` and `seo.description`, falling back to the title and summary. The canonical address uses `SITE_URL`. The link-preview image is the cover photo when there is one, otherwise `/og/[slug]`; until 3b builds `/og`, an article without a photo has none.
- **Cards** (used here and in 3b): the cover, the label row, the title, the summary, and the reading time and difficulty.

### 6.2 Landing page (3b)

- **Featured article:** the one chosen in site settings while it is published, otherwise the newest article. A large cover beside the label row, title, summary and byline.
- **Featured:** the published picks from site settings, without the featured article, as three cards. Hidden when there are none.
- **Latest:** up to six of the newest articles not already shown above, as rows with a thumbnail and the date, then "All articles →".
- **Sidebar** (below Latest under 860 px):
  - **About SageVani:** `aboutText`, falling back to the tagline. The link to `/about` appears only while that page is published.
  - **Start here:** the published articles of the Start-here list, in order.
  - **Topics:** all four topics, each with its number of published articles, linking to its page.
- **Four questions:** a band with each topic's name and question, linking to its page.
- **Subscribe** arrives in stage 4, after the band.
- **With no published articles**, the featured, Featured and Latest sections are replaced by one line of placeholder text (section 9).

### 6.3 Other pages (3b)

- **`/articles`**
  - Every published article, newest first, 12 to a page, as rows.
  - Filters for topic, shape and difficulty in a GET form with a submit button, plus a link that clears them. Values in the URL are slugs: the topic's slug, the shape's value, and the difficulty level's name folded like a slug (`?difficulty=advanced`).
  - An unknown filter value is ignored. A page number past the last page returns 404. Page 1 has no `page` parameter.
- **`/topics/[slug]`:** the topic's name, question and intro, then its published articles, paginated like the archive. An unknown slug returns 404.
- **`/start-here`:** the body of the published page whose slug is `start-here`, then the Start-here list in order, as cards. With neither, 404.
- **`/[slug]`:** the published page with that slug, title and body. An unknown or unpublished slug returns 404.
- **`/corrections`:** every correction marked "show a public note" across published articles, newest first, each with its date, what changed, and the article's title as a link.

### 6.4 Not found and errors

- **404:** in the site's design, with a link home and to the archive.
- **Errors:** a page in the site's design with no stack trace. The error is logged with context on the server.

### 6.5 Link-preview images (3b)

- `/og/[slug]` draws design A at 1200 × 630 with Next's `ImageResponse`, using the static Literata files (5.2). It runs on the Node runtime.
- It is cached and refreshed with the pages. An unknown or unpublished slug returns 404.
- An article with a cover photo uses the photo instead (6.1, metadata).
- **Cover terms are Latin script with IAST.** The renderer can't shape Devanagari, so the `coverTerm` field's description says so.

## 7. Content model changes

- **`aboutText`** in site settings (3b): an optional textarea for the landing page's About box. Read by anyone, edited by the owner, like the rest of site settings. One migration adds the column.
- **Reserved page slugs** (3b): the `pages` slug check refuses the slugs in 4.1. No migration.
- **`coverTerm`'s description** (3b) gains the Latin-script note. No migration.
- **Live preview settings** (3a) on `articles` and `pages`. No migration.
- **Slug length** (3a): slugs are capped at 200 characters, the longest a route accepts. Payload checks it on publish, and on every save for topics. No migration: the column has no length.
- **Media can't be duplicated** (3a): a duplicate would keep the original's file under a changed name. No migration.
- **Slugs on edit** (3a): tests confirm that an edit that doesn't send `slug` keeps the stored one. No code change was needed.

## 8. Errors

- **Database unreachable:** cached pages keep serving. A page that isn't cached yet shows the error page, and the error is logged.
- **Refresh fails:** logged, and the save stands (4.3).
- **A deleted image** that published content still references is skipped, never drawn as a broken image.

## 9. Placeholder interface copy

Written now as placeholders and approved or rewritten by the owner, alongside parent spec 18, item 3:

- the landing page's line when nothing is published;
- the headings "Featured", "Latest", "Four questions", "Before you read", "Suggested prior reading", "Sources" and "More from [topic]";
- the 404 and error page text;
- the reader-facing strings that stage 3a added: "Share", "Copy link", "Link copied", "Copy failed", "Supports:", "accessed", "Correction,", "Sources (n)", "Menu", and the theme toggle's "Switch to light theme", "Switch to dark theme" and "Switch theme";
- the names only screen readers hear: " (done)", " (not done)", " (opens in a new tab)", and the landmark names "Main", "Footer", "Share this article" and "Corrections".

The interface never invents article content, translations or attributions. Every block's text comes from the article.

## 10. Testing

Coverage stays at 80% or more. Components are covered by the end-to-end tests. Their logic lives in `src/lib/site/`, which the unit coverage counts.

- **Unit tests:**
  - the contrast of every token pair in both themes;
  - the cover tint from the first topic, the no-topic tint, and the cover term's fallback to the title;
  - dates in UTC;
  - share links and their encoding;
  - which link addresses are allowed;
  - source grouping and order;
  - the landing page's selection: the featured fallback, removing duplicates, dropping unpublished entries;
  - archive filters and page numbers;
  - reserved page slugs;
  - which saves refresh pages;
  - the local image route's name check;
  - reading `SITE_URL` and `SITE_INDEXING`.
- **Integration tests** against the test database:
  - the public data layer returns published documents only;
  - no staff-only field appears in its results, including through a body link or a prior reading to an article whose approval is set;
  - unpublished site-settings entries and prior readings are dropped;
  - the image lookup returns only its selected fields, and only for referenced images;
  - with Next's refresh replaced by a stub: publish, unpublish, deleting a published article, and edits to topics, levels, settings and media refresh; draft saves and autosaves on a published article's draft don't;
  - reserved slugs are refused, and `aboutText` is owner-only to edit.
- **End-to-end tests (Playwright):**
  - reading an article: the blocks, Before you read, sources and a correction note;
  - the Devanagari font is requested on a page with a Devanagari verse and not on one without;
  - the theme toggle survives a reload, with the stored theme applied before the first paint;
  - live preview: the owner sees an unsaved draft change after autosave; an anonymous visitor gets 404;
  - publishing an edit updates the public page;
  - 404 for an unknown slug and for an unpublished article;
  - the archive's filters and pages;
  - the landing page with nothing published and with six articles;
  - `noindex` on public pages;
  - axe accessibility checks on every page type, in both themes;
  - screenshots of every page type at the six test widths in both themes, saved as CI artifacts for review rather than compared pixel by pixel.
- **On a Netlify deploy preview,** checked by hand and listed in each pull request's test plan, because Netlify's network can't run in CI: publishing updates the live page, and images load through the image CDN.

New dependencies: `@payloadcms/live-preview-react` at Payload's version (3.90.2), and `@axe-core/playwright` for development only.

## 11. Not in stage 3

| Item | Where |
| --- | --- |
| Likes, comments and moderation, and the slots they fill on the article page | Stage 4 |
| Subscribe, on the landing page and its own pages | Stage 4 |
| Refreshing the article page when a comment is approved, through the same `site` tag | Stage 4 |
| Search, RSS, sitemap, `robots.txt`, structured data, Google Analytics and the cookie banner | Stage 5 |
| The Content Security Policy: the theme script allowed by its hash, `frame-ancestors 'self'` for the live-preview frame, the image CDN and bucket hosts | Stage 6 |
| Lighthouse and performance passes | Stage 6 |

## 12. Documents this stage updates

- **Parent spec:**
  - a link to this spec;
  - the `/[slug]` route and its reserved slugs;
  - the preview and local image routes;
  - `SITE_URL` and `SITE_INDEXING`;
  - `aboutText` in site settings;
  - `robots.txt` in stage 5.
- [Environments guide](../environments.md): `SITE_URL` and `SITE_INDEXING` per deploy context, and applying a branch's migrations to staging before its deploy preview builds.
- `CHANGELOG.md` and `docs/operations/tasks.md`.
