# Fonts

Static Literata TTF cuts, for `/og/[slug]` link-preview image rendering only (stage 3b, design spec 5.2 and 6.5). Every other page uses `next/font/google`'s variable Literata (`src/styles/fonts.ts`), which these files do not replace.

## Why static files are here

The link-preview renderer uses Next's `ImageResponse` (Satori 0.25, bundled with Next 16.3.8), which can only shape glyphs from font data it is given directly as a buffer. It cannot read variable fonts, WOFF2, `@font-face`, or Next's font optimization pipeline. The route handler that consumes these files reads them from disk at request time (`fs.readFile`, Node runtime), so they are checked in as plain static TTFs.

## Literata

- **Creator:** The Literata Project Authors — designed by Clayton Leung and Scott Zhang at Google Fonts, with the Google Fonts team.
- **Source:** https://github.com/googlefonts/literata
- **Version / commit fetched:** tag `3.103`, commit `0c2761b727a1b3a7cffd313c37f0f5163dfc7a63`
- **Files fetched:**
  - `fonts/ttf/Literata72pt-Italic.ttf` → 296,900 bytes, git blob sha `d9ca913ba276fd1178027a97acf59d99b79b3a0d`
  - `fonts/ttf/Literata72pt-Medium.ttf` → 330,892 bytes, git blob sha `2aa09d82468da3b38fa2364673a2b08437bc83d3`
  - `OFL.txt` → 4,389 bytes
- **License:** SIL Open Font License, Version 1.1 (`OFL.txt` in this directory, fetched from the same commit).
- **Intended use:** `/og/[slug]` link-preview image rendering only (design A, 1200×630 cover). Not loaded anywhere else in the app.

### Why the 72pt optical-size cut

Literata's static TTFs ship in four optical sizes (7pt, the default/text cut, 36pt, 72pt). The cover's `coverTerm` is the dominant element of a 1200×630 image, rendered at up to `16cqw` (roughly 190px tall for short terms, per `Cover.module.css`) — a large display size, not body text. The 72pt cut is drawn for exactly that headline/display range, so it was chosen over the default or 36pt cuts.

### Why Italic and Medium, specifically

The cover (`Cover.tsx` / `Cover.module.css`, design A) only ever renders two Literata combinations:

- `.term` (the large cover term) and `.mark` (the "SageVani" corner mark): italic, regular (400) weight → **Literata72pt-Italic.ttf**.
- `.title` (the title under the term, when shown): normal style, medium (500) weight → **Literata72pt-Medium.ttf**.

No other weight or style appears in the cover design, so no other cut was downloaded.

### Glyph coverage check

Cover terms are IAST-transliterated Sanskrit (6.5: "Cover terms are Latin script with IAST"). Both cuts were checked with `fontTools` (`TTFont.getBestCmap()`) for the ten IAST diacritic characters most likely to be dropped by a Latin font — ṛ ṣ ṇ ṭ ḍ ṅ ñ ṃ ḥ ś — rather than assuming coverage from the family's general reputation. Both `Literata72pt-Italic.ttf` and `Literata72pt-Medium.ttf` cover all ten.

### Integrity

Each downloaded file's local git blob hash (`sha1("blob " + size + "\0" + content)`) was recomputed and matched exactly against the GitHub API's reported blob sha for that path at commit `0c2761b727a1b3a7cffd313c37f0f5163dfc7a63`, confirming the bytes are identical to what's published in the googlefonts/literata repository.
