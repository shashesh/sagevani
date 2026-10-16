# Browser test scenarios

Most browser tests assume the `standard` scenario, seeded once by `global-setup.ts` before the
whole run. A test file that needs different content — the landing page's empty state, or its
normal-content rendering without pagination noise — switches scenario with `useScenario()`
(`scenario.ts`) instead of writing its own seed.

## The three scenarios

- **`standard`** (the default): 3a's reading content (`seed-reading.ts`) plus 3b's topics, pages,
  settings and an archive-sized article list (`seed-site.ts`). At least 13 published articles, so
  `/articles` paginates at 12 a page; a featured article, featured picks and a Start here list in
  site settings; the `about`, `how-sagevani-writes` and `start-here` pages published, plus one
  draft page.
- **`empty`**: just the owner account, the difficulty levels and the four topics. Nothing else is
  published. For the landing page's "nothing published" state.
- **`six`**: exactly six published articles, curated site settings (a featured article and a
  pick), and one published About page. For the landing page's normal-content rendering without
  archive-pagination noise.

## Using a scenario in a test file

```ts
import { expect, test } from '@playwright/test'

import { useScenario } from './scenario'

// A scenario switch changes seeded data; a retry can't start clean, so don't retry this file.
test.describe.configure({ retries: 0 })

test.afterAll(async () => {
  // Every other test file assumes `standard`; always restore it, even if a test above failed.
  await useScenario('standard')
})

test('the landing page with nothing published', async ({ page }) => {
  await useScenario('empty')
  await page.goto('/')
  // ...
})
```

`useScenario()` resets the test database to the named scenario (`reset-database.ts`), then saves
site settings through the running server (`refresh-site.ts`). That save is what clears the `site`
cache tag (stage 3 design 4.3): content seeded directly through the Local API runs outside Next, so
nothing refreshes until a save goes through Next. Always let `useScenario()` make that call; don't
seed content and skip it.

Because workers are serial (`playwright.config.ts` sets `workers: 1`), one file's `afterAll`
finishes restoring `standard` before the next file's tests start.
