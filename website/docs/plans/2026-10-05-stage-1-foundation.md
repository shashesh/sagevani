# SageVani website — Stage 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working Payload CMS 3 + Next.js 16 app in `website/`. It stores everything in Postgres, in a dedicated `payload` schema that is hardened against Supabase's public API. It has owner and assistant roles, checked environment variables, a migration that works on a fresh database, a safe way to create the owner account, CI on GitHub Actions, and the Netlify configuration plus an environment guide.

**Architecture:** One Next.js app with Payload installed inside it (`src/app/(payload)` holds the admin and API; `src/app/(frontend)` holds the public site). Payload talks to Postgres through `@payloadcms/db-postgres`, with `schemaName: 'payload'`.

- **Local:** Postgres 17 runs in Docker, and Payload's automatic schema "push" keeps the database in sync during development.
- **Deployed:** databases change only through committed migrations, followed by a hardening step that enables row-level security and revokes Supabase's API roles.

**Tech Stack:** Payload 3.90.2, Next.js 16.3.8, React 19.2, TypeScript 5.7, Postgres 17, Zod 4, Vitest 4, Playwright 1.58, ESLint 9 (Next flat config), GitHub Actions, Netlify, Supabase.

**Spec:** [`../specs/2026-10-05-sagevani-website-design.md`](../specs/2026-10-05-sagevani-website-design.md), sections 4, 5.3 (users), 9, 13, 14 and 16 (stage 1).

---

## Before you start

- **Verified in advance.** Every command and code block here was run against Payload 3.90.2 on 2026-10-05, in a throwaway copy of this project with a real Postgres 17. Three facts that run established are built into the tasks:
  1. `create-payload-app` creates its own `.git` folder. Task 2 removes it.
  2. The migration Payload generates for a custom schema does **not** create the schema itself. Task 9 adds `CREATE SCHEMA IF NOT EXISTS "payload";`.
  3. Scripts that load Payload must run with `NODE_ENV=production`, so that development-mode schema push is off, and must call `process.exit()`. Otherwise they stop at an interactive prompt or never exit.
- **Shell.** Commands use Git Bash syntax. Run them from `website/` unless a step says "from the repository root".
- **Docker Desktop must be running** for the local database (`docker info` should succeed).
- **Owner-only steps** are marked **[OWNER]**. Deleting or creating GitHub repositories, creating cloud accounts and projects, and entering production secrets are outward-facing actions. Do not perform them without the owner's explicit go-ahead in the conversation.
- **Commit messages** use the repository's conventional format (`feat:`, `test:`, `chore:`, `ci:`, `docs:`) with no attribution trailer.
- **Before every commit that contains code,** run `npm run lint && npm run typecheck` (from Task 3 on) plus the tests named in the task.

## File map

| Path | Responsibility |
| --- | --- |
| `.gitignore`, `.gitattributes` (root) | Repository-wide ignores and line-ending rules |
| `.github/workflows/website-ci.yml` | CI: lint, typecheck, tests with coverage, migrate-and-build on a fresh database, e2e on pull requests |
| `netlify.toml` (root) | Netlify build settings for the `website/` app |
| `website/package.json` | Scripts and dependencies |
| `website/docker-compose.yml`, `website/docker/create-test-database.sql` | Local Postgres 17 with `sagevani` and `sagevani_test` databases |
| `website/.env.example`, `website/.env.test` | Documented variables; test-only values (committed) |
| `website/src/payload.config.ts` | Payload configuration |
| `website/src/lib/env.ts` | Validates required environment variables |
| `website/src/lib/db-schema.ts` | The schema name constant (`payload`) |
| `website/src/lib/harden-database.ts` | Enables RLS and revokes Supabase API roles on the schema |
| `website/src/lib/create-owner.ts` | Creates the single owner account on an empty database |
| `website/src/access/roles.ts` | Role constants and access helpers |
| `website/src/collections/Users.ts` | Users, auth settings, role rules |
| `website/src/migrations/*` | Committed database migrations |
| `website/scripts/harden-database.ts`, `website/scripts/create-owner.ts` | Command-line entry points for the two library functions |
| `website/src/app/(frontend)/layout.tsx`, `page.tsx` | Placeholder public page |
| `website/tests/unit/*.unit.spec.ts` | Fast tests with no database |
| `website/tests/int/*.int.spec.ts` | Tests against the `sagevani_test` database |
| `website/tests/e2e/*.e2e.spec.ts` | Browser tests against the dev server |
| `website/docs/environments.md` | How to run locally and set up staging and production |

---

### Task 1: Put the workspace under Git and on GitHub

**Files:**

- Create: `.gitignore` (repository root)
- Create: `.gitattributes` (repository root)

- [ ] **Step 1: [OWNER] Remove the old `sagevani` repository**

The owner decided on 2026-10-05 to delete the 2025 `shashesh/sagevani` repository and reuse the name. Ask the owner to run the following, or confirm that you may:

```bash
gh auth refresh -h github.com -s delete_repo
gh repo delete shashesh/sagevani --yes
```

Then verify that it's gone:

```bash
gh repo view shashesh/sagevani
```

Expected: `GraphQL: Could not resolve to a Repository with the name 'shashesh/sagevani'.`

- [ ] **Step 2: Create the root `.gitignore`**

```gitignore
# Operating system and editor files
.DS_Store
Thumbs.db
desktop.ini

# Word lock files created while the handbook is open
~$*

# Local tool state
.superpowers/
```

- [ ] **Step 3: Create the root `.gitattributes`**

```gitattributes
* text=auto eol=lf
*.docx binary
*.png binary
*.jpg binary
*.jpeg binary
*.webp binary
*.ico binary
```

- [ ] **Step 4: Initialise the repository and make the first commit (from the repository root)**

```bash
git init -b main
git add -A
git status --short
```

Expected: every workspace file is listed. That means `README.md`, `AGENTS.md`, `CHANGELOG.md`, `docs/…`, `templates/…`, `vault/…`, `research/…`, `content/…`, `assets/…`, `website/…` and `SageVani_Foundation_Handbook_v1.docx`. No `~$…` files appear. Line-ending warnings (`CRLF will be replaced by LF`) are expected.

```bash
git commit -m "docs: add SageVani foundation workspace"
```

- [ ] **Step 5: [OWNER] Create the GitHub repository and push**

The project brief says the repository is public during setup and becomes private once the site is live. Confirm the visibility with the owner, then run:

```bash
gh repo create shashesh/sagevani --public --source . --remote origin --push
```

Expected: `✓ Created repository shashesh/sagevani on GitHub` and `✓ Pushed commits to https://github.com/shashesh/sagevani.git`.

- [ ] **Step 6: Start the stage 1 branch**

```bash
git switch -c feat/website-foundation
```

---

### Task 2: Scaffold the Payload app in `website/`

**Files:**

- Create: the `website/` app files from the Payload blank template
- Modify: `website/package.json`
- Create: `website/docker-compose.yml`, `website/docker/create-test-database.sql`, `website/.env.example`, `website/.env.test`
- Replace: `website/src/payload.config.ts`, `website/src/app/(frontend)/layout.tsx`, `website/src/app/(frontend)/page.tsx`
- Delete: the template's Media collection, sample route, styles and sample tests

- [ ] **Step 1: Generate the template next to `website/` (from the repository root)**

```bash
npx -y create-payload-app@3.90.2 -n website-scaffold -t blank --db postgres \
  --db-connection-string "postgres://postgres:postgres@127.0.0.1:54329/sagevani" \
  --no-deps --no-agent --use-npm </dev/null
```

Expected: the output ends with `Payload project successfully created!`.

- [ ] **Step 2: Drop what we don't use, then move the rest into `website/` (from the repository root)**

`website/` already contains `README.md` and `docs/`, so the template's README is removed rather than copied over them.

```bash
cd website-scaffold
rm -rf .git .env .vscode .yarnrc Dockerfile docker-compose.yml README.md test.env \
  src/collections/Media.ts src/app/my-route "src/app/(frontend)/styles.css" tests
cd ..
cp -r website-scaffold/. website/
rm -rf website-scaffold
ls website
```

Expected: `README.md  docs  eslint.config.mjs  next.config.ts  package.json  playwright.config.ts  src  tsconfig.json  vitest.config.mts  vitest.setup.ts`. Dotfiles such as `.gitignore`, `.npmrc`, `.env.example` and `.prettierrc.json` are also present.

- [ ] **Step 3: Set package metadata and scripts (from `website/`)**

No license has been chosen (open question Q-06), so the template's MIT license is removed and the package is marked private.

```bash
cd website
npm pkg set name=sagevani-website description="SageVani blog website: Payload CMS in Next.js"
npm pkg set private=true --json
npm pkg delete license pnpm engines.pnpm
npm pkg set engines.node=">=24"
npm pkg set scripts.typecheck="tsc --noEmit"
npm pkg set scripts.test="npm run test:unit && npm run test:int"
npm pkg set "scripts.test:unit=cross-env NODE_OPTIONS=--no-deprecation vitest run tests/unit"
npm pkg set "scripts.test:int=cross-env NODE_OPTIONS=--no-deprecation vitest run tests/int"
npm pkg set "scripts.test:coverage=cross-env NODE_OPTIONS=--no-deprecation vitest run --coverage"
npm pkg set "scripts.test:e2e=cross-env NODE_OPTIONS=--no-deprecation playwright test"
npm pkg set "scripts.db:up=docker compose up -d --wait"
npm pkg set "scripts.db:reset=docker compose down -v && docker compose up -d --wait"
npm pkg get scripts
```

Expected: `npm pkg get private` prints `true` (not `"true"`). The printed scripts include `build`, `dev`, `generate:importmap`, `generate:types`, `lint`, `payload` and `start` from the template, plus the nine scripts set above.

- [ ] **Step 4: Install dependencies, plus Zod, pg and coverage**

```bash
npm install --no-audit --no-fund
npm install --save-exact --no-audit --no-fund zod@4.6.5 pg@8.20.0
npm install --save-exact --no-audit --no-fund -D @types/pg@8.20.0 @vitest/coverage-v8@4.0.18
# Security patches over the template's pins (added after the Task 2 review):
# next 16.3.3 has a critical RCE in next/og ImageResponse (GHSA-vcvr-r3jv-pc5j); sharp 0.35.4 a high advisory (GHSA-wq5f-xc86-pv6w).
npm install --save-exact --no-audit --no-fund next@16.3.8 sharp@0.35.5
npm install --save-exact --no-audit --no-fund -D eslint-config-next@16.3.8 @types/node@24.19.1
npm pkg delete scripts.devsafe
```

Expected:

- `package-lock.json` is created.
- `npm ls zod pg @vitest/coverage-v8 next sharp` shows `zod@4.6.5`, `pg@8.20.0`, `@vitest/coverage-v8@4.0.18`, `next@16.3.8` and `sharp@0.35.5`.
- `npm audit --omit=dev` lists no `next` or `sharp` advisory. Advisories for `undici` through `payload` have no upstream fix yet; track them, and don't run `npm audit fix`.

The template's `devsafe` script is removed because it uses `rm -rf`, which fails when npm runs scripts through `cmd.exe` on Windows.

- [ ] **Step 5: Create `website/docker-compose.yml`**

```yaml
name: sagevani

services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: sagevani
    ports:
      - '127.0.0.1:54329:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/create-test-database.sql:/docker-entrypoint-initdb.d/create-test-database.sql:ro
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h 127.0.0.1 -U postgres -d sagevani']
      interval: 2s
      timeout: 3s
      retries: 20

volumes:
  pgdata:
```

- **Port:** 54329 avoids clashing with any Postgres already installed on 5432. It's bound to `127.0.0.1`, so the trivial local password is never reachable from the network.
- **Image:** `postgres:17` (glibc) sorts text the same way as Supabase. The Alpine image (musl) does not.
- **Healthcheck:** it checks over TCP, so `--wait` only returns once the real server is accepting connections.

- [ ] **Step 6: Create `website/docker/create-test-database.sql`**

```sql
CREATE DATABASE sagevani_test;
```

- [ ] **Step 7: Replace `website/.env.example`**

```dotenv
# Copy to .env and fill in. Never commit .env.

# Local database started by `npm run db:up`
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/sagevani

# At least 32 characters. Generate one with:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
PAYLOAD_SECRET=

# Deploy only: Supabase session-pooler URL used for migrations. Falls back to DATABASE_URL.
DATABASE_MIGRATION_URL=
```

- [ ] **Step 8: Create `website/.env.test` (committed; test-only values)**

```dotenv
# Test-only settings, safe to commit. Vitest loads this file before .env,
# and values already set in the environment (for example in CI) win.
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/sagevani_test
PAYLOAD_SECRET=test-only-secret-not-used-anywhere-else-0123
```

- [ ] **Step 9: Create your local `.env` with a fresh secret**

```bash
cp .env.example .env
SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
sed -i "s/^PAYLOAD_SECRET=$/PAYLOAD_SECRET=$SECRET/" .env
grep -c "^PAYLOAD_SECRET=.\{64\}$" .env
```

Expected: `1`.

- [ ] **Step 10: Replace `website/src/payload.config.ts` (Media removed)**

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
    },
  }),
  sharp,
  plugins: [],
})
```

- [ ] **Step 11: Replace the template home page with a placeholder**

`website/src/app/(frontend)/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'SageVani',
  description: 'Where silence learns to speak.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

`website/src/app/(frontend)/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main>
      <h1>SageVani</h1>
      <p>Where silence learns to speak.</p>
    </main>
  )
}
```

- [ ] **Step 11a: Tighten `.gitignore` and remove template leftovers**

Replace `website/.gitignore`. The template ignored only `.env` and `.env*.local`, which would let `.env.production` slip into a public repository.

```gitignore
# dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

/.idea/*
!/.idea/runConfigurations

# testing
/coverage
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# env files: ignore everything except the documented, non-secret ones
.env*
!.env.example
!.env.test

# netlify
.netlify

# typescript
*.tsbuildinfo
next-env.d.ts
```

In `website/next.config.ts`, delete the `images: { localPatterns: [...] }` block. It points at the removed Media collection.

- [ ] **Step 12: Regenerate types and the admin import map**

```bash
npm run generate:types
npm run generate:importmap
```

Expected: `Types written to …src/payload-types.ts` and `Writing import map to …importMap.js`.

- [ ] **Step 13: Start the database and check the admin loads**

```bash
npm run db:up
npm run dev
```

Expected: `docker compose` reports the `db` container as healthy. Open `http://localhost:3000/admin`: it redirects to `/admin/create-first-user` and shows an email field. Then stop the dev server with Ctrl+C. Don't create an account; later tasks reset the database.

- [ ] **Step 14: Commit (from the repository root)**

```bash
git add website
git status --short website | grep -E "\.env$" || echo "no .env staged"
git commit -m "feat: scaffold Payload 3.90 and Next.js 16 app with Postgres in website/"
```

Expected before committing: `no .env staged`.

---

### Task 3: Test and lint tooling

**Files:**

- Replace: `website/vitest.config.mts`, `website/vitest.setup.ts`, `website/playwright.config.ts`, `website/eslint.config.mjs`

- [ ] **Step 1: Replace `website/vitest.config.mts`**

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/unit/**/*.unit.spec.ts', 'tests/int/**/*.int.spec.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: {
      provider: 'v8',
      include: ['src/access/**', 'src/lib/**', 'src/collections/**'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
```

`fileParallelism: false` is required because the integration test files share one database.

- [ ] **Step 2: Replace `website/vitest.setup.ts`**

```ts
// Test settings take precedence: dotenv never overwrites a variable that is already set,
// so values from .env.test (or CI) win over the developer's .env.
import { config } from 'dotenv'

config({ path: '.env.test' })
config({ path: '.env' })
```

- [ ] **Step 3: Replace `website/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

const PORT = 3000
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 4: Replace `website/eslint.config.mjs`**

The template's version uses `FlatCompat`, which crashes with `eslint-config-next` 16 (`Converting circular structure to JSON`). Next 16 ships flat configs directly:

```js
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  globalIgnores([
    '.next/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    'src/payload-types.ts',
    'src/app/(payload)/**',
    'src/migrations/**',
  ]),
])
```

- [ ] **Step 5: Lint and typecheck**

```bash
npm run lint
npm run typecheck
```

Expected: both exit with code 0 and print no errors.

- [ ] **Step 6: Commit**

```bash
git add website
git commit -m "chore: configure Vitest, Playwright and ESLint flat config for the website"
```

---

### Task 4: Validate required environment variables

**Files:**

- Create: `website/tests/unit/env.unit.spec.ts`
- Create: `website/src/lib/env.ts`
- Modify: `website/src/payload.config.ts`

- [ ] **Step 1: Write the failing test** — `website/tests/unit/env.unit.spec.ts`

```ts
import { describe, expect, it } from 'vitest'

import { parseServerEnv } from '@/lib/env'

const VALID = {
  DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/sagevani',
  PAYLOAD_SECRET: 'a'.repeat(32),
}

describe('parseServerEnv', () => {
  it('returns the variables when all are valid', () => {
    expect(parseServerEnv(VALID)).toEqual(VALID)
  })

  it('accepts the postgresql:// scheme', () => {
    const env = { ...VALID, DATABASE_URL: 'postgresql://u:p@db.example.com:6543/postgres' }
    expect(parseServerEnv(env).DATABASE_URL).toBe(env.DATABASE_URL)
  })

  it('names every missing variable in one error', () => {
    expect(() => parseServerEnv({})).toThrowError(
      /DATABASE_URL: is required[\s\S]*PAYLOAD_SECRET: is required/,
    )
  })

  it('rejects a non-postgres connection string', () => {
    expect(() => parseServerEnv({ ...VALID, DATABASE_URL: 'mongodb://127.0.0.1/sagevani' })).toThrowError(
      /DATABASE_URL: must be a postgres:\/\/ connection string/,
    )
  })

  it('rejects a short secret', () => {
    expect(() => parseServerEnv({ ...VALID, PAYLOAD_SECRET: 'short' })).toThrowError(
      /PAYLOAD_SECRET: must be at least 32 characters/,
    )
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm run test:unit
```

Expected: FAIL with `Failed to resolve import "@/lib/env"`.

- [ ] **Step 3: Implement** — `website/src/lib/env.ts`

```ts
import { z } from 'zod'

const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string({ error: 'is required' })
    .regex(/^postgres(ql)?:\/\/.+/, 'must be a postgres:// connection string'),
  PAYLOAD_SECRET: z.string({ error: 'is required' }).min(32, 'must be at least 32 characters'),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverEnvSchema.safeParse(source)
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `- ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid or missing environment variables:\n${problems}`)
  }
  return result.data
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
npm run test:unit
```

Expected: PASS, `5 passed`.

- [ ] **Step 5: Use it in `website/src/payload.config.ts`**

Replace the whole file:

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { parseServerEnv } from './lib/env'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const env = parseServerEnv(process.env)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users],
  editor: lexicalEditor(),
  secret: env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URL,
    },
  }),
  sharp,
  plugins: [],
})
```

- [ ] **Step 6: Verify and commit**

```bash
npm run lint && npm run typecheck && npm run test:unit
git add website
git commit -m "feat: fail fast on missing or invalid website environment variables"
```

Expected: all three commands pass before the commit.

---

### Task 5: Role constants and access helpers

**Files:**

- Create: `website/tests/unit/roles.unit.spec.ts`
- Create: `website/src/access/roles.ts`

- [ ] **Step 1: Write the failing test** — `website/tests/unit/roles.unit.spec.ts`

```ts
import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { isOwner, ownerOnly, ownerOnlyField, ownerOrSelf } from '@/access/roles'

const reqWith = (user: unknown) => ({ req: { user } as unknown as PayloadRequest })

const owner = { id: 1, role: 'owner' }
const assistant = { id: 2, role: 'assistant' }

describe('isOwner', () => {
  it('is true only for the owner role', () => {
    expect(isOwner(owner as never)).toBe(true)
    expect(isOwner(assistant as never)).toBe(false)
    expect(isOwner(null)).toBe(false)
    expect(isOwner(undefined)).toBe(false)
  })
})

describe('ownerOnly', () => {
  it('allows the owner and denies everyone else', () => {
    expect(ownerOnly(reqWith(owner) as never)).toBe(true)
    expect(ownerOnly(reqWith(assistant) as never)).toBe(false)
    expect(ownerOnly(reqWith(null) as never)).toBe(false)
  })
})

describe('ownerOnlyField', () => {
  it('allows the owner and denies everyone else', () => {
    expect(ownerOnlyField(reqWith(owner) as never)).toBe(true)
    expect(ownerOnlyField(reqWith(assistant) as never)).toBe(false)
  })
})

describe('ownerOrSelf', () => {
  it('gives the owner everything', () => {
    expect(ownerOrSelf(reqWith(owner) as never)).toBe(true)
  })

  it('limits an assistant to their own record', () => {
    expect(ownerOrSelf(reqWith(assistant) as never)).toEqual({ id: { equals: 2 } })
  })

  it('denies anonymous requests', () => {
    expect(ownerOrSelf(reqWith(null) as never)).toBe(false)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm run test:unit
```

Expected: FAIL with `Failed to resolve import "@/access/roles"`.

- [ ] **Step 3: Implement** — `website/src/access/roles.ts`

```ts
import type { Access, FieldAccess } from 'payload'

export const ROLES = ['owner', 'assistant'] as const
export type Role = (typeof ROLES)[number]

type RoleHolder = { id?: number | string; role?: Role | null } | null | undefined

export const isOwner = (user: RoleHolder): boolean => user?.role === 'owner'

export const ownerOnly: Access = ({ req }) => isOwner(req.user as RoleHolder)

export const ownerOnlyField: FieldAccess = ({ req }) => isOwner(req.user as RoleHolder)

export const ownerOrSelf: Access = ({ req }) => {
  const user = req.user as RoleHolder
  if (!user) return false
  if (isOwner(user)) return true
  return { id: { equals: user.id } }
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
npm run test:unit
```

Expected: PASS, `11 passed` (env + roles).

- [ ] **Step 5: Verify and commit**

```bash
npm run lint && npm run typecheck
git add website
git commit -m "feat: add owner and assistant role helpers for access control"
```

---

### Task 6: Keep every table in the dedicated `payload` schema

**Files:**

- Create: `website/tests/int/database.int.spec.ts`
- Create: `website/src/lib/db-schema.ts`
- Modify: `website/src/payload.config.ts`

- [ ] **Step 1: Start from clean databases**

```bash
npm run db:reset
```

Expected: the container is recreated and healthy. Both `sagevani` and `sagevani_test` are empty.

- [ ] **Step 2: Write the failing test** — `website/tests/int/database.int.spec.ts`

```ts
import { Pool } from 'pg'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

const DB_SCHEMA = 'payload'

let payload: Payload
let pool: Pool

describe('database layout', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  })

  afterAll(async () => {
    await pool.end()
    await payload.destroy()
  })

  it('keeps every Payload table in the dedicated schema, none in public', async () => {
    const { rows } = await pool.query<{ schemaname: string; tablename: string }>(
      `SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('public', $1)`,
      [DB_SCHEMA],
    )
    const inSchema = rows.filter((r) => r.schemaname === DB_SCHEMA).map((r) => r.tablename)
    const inPublic = rows.filter((r) => r.schemaname === 'public').map((r) => r.tablename)

    expect(inSchema).toContain('users')
    expect(inPublic).toEqual([])
  })
})
```

- [ ] **Step 3: Run it and watch it fail**

```bash
npm run test:int
```

Expected: FAIL. `expected [] to include 'users'`: Payload created its tables in `public`.

- [ ] **Step 4: Implement** — create `website/src/lib/db-schema.ts`

```ts
// Payload's tables live here instead of `public`, which Supabase publishes through its web API.
export const DB_SCHEMA = 'payload'
```

Then replace `website/src/payload.config.ts`:

```ts
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Users } from './collections/Users'
import { DB_SCHEMA } from './lib/db-schema'
import { parseServerEnv } from './lib/env'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const env = parseServerEnv(process.env)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users],
  editor: lexicalEditor(),
  secret: env.PAYLOAD_SECRET,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URL,
    },
    schemaName: DB_SCHEMA,
    migrationDir: path.resolve(dirname, 'migrations'),
  }),
  sharp,
  plugins: [],
})
```

In the test, replace `const DB_SCHEMA = 'payload'` with the shared constant:

```ts
import { DB_SCHEMA } from '@/lib/db-schema'
```

- [ ] **Step 5: Clear the tables the failing run left in `public`, then run again**

```bash
npm run db:reset
npm run test:int
```

Expected: PASS, `1 passed`.

- [ ] **Step 6: Verify and commit**

```bash
npm run lint && npm run typecheck
git add website
git commit -m "feat: store Payload tables in a dedicated payload schema"
```

---

### Task 7: Users, owner and assistant roles, login lockout

**Files:**

- Create: `website/tests/int/users.int.spec.ts`
- Replace: `website/src/collections/Users.ts`
- Regenerate: `website/src/payload-types.ts`

- [ ] **Step 1: Write the failing test** — `website/tests/int/users.int.spec.ts`

```ts
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let payload: Payload

const password = 'correct-horse-battery-staple'

const clearUsers = () =>
  payload.delete({ collection: 'users', where: { id: { exists: true } }, overrideAccess: true })

const createOwner = () =>
  payload.create({
    collection: 'users',
    data: { email: 'owner@example.com', name: 'Owner', password, role: 'owner' },
    overrideAccess: true,
  })

describe('users and roles', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearUsers()
  })

  afterAll(async () => {
    await clearUsers()
    await payload.destroy()
  })

  it('makes the first account the owner, whatever role was requested', async () => {
    const first = await payload.create({
      collection: 'users',
      data: { email: 'first@example.com', name: 'First', password, role: 'assistant' },
      overrideAccess: false,
    })
    expect(first.role).toBe('owner')
  })

  it('refuses anonymous sign-ups once an account exists', async () => {
    await createOwner()
    await expect(
      payload.create({
        collection: 'users',
        data: { email: 'stranger@example.com', name: 'Stranger', password, role: 'owner' },
        overrideAccess: false,
      }),
    ).rejects.toThrow(/not allowed/i)
  })

  it('lets the owner create an assistant', async () => {
    const owner = await createOwner()
    const assistant = await payload.create({
      collection: 'users',
      data: { email: 'assistant@example.com', name: 'Assistant', password, role: 'assistant' },
      overrideAccess: false,
      user: owner,
    })
    expect(assistant.role).toBe('assistant')
  })

  it('does not let an assistant promote themselves', async () => {
    const owner = await createOwner()
    const assistant = await payload.create({
      collection: 'users',
      data: { email: 'assistant@example.com', name: 'Assistant', password, role: 'assistant' },
      overrideAccess: true,
    })
    const updated = await payload.update({
      collection: 'users',
      id: assistant.id,
      data: { role: 'owner' },
      overrideAccess: false,
      user: assistant,
    })
    expect(updated.role).toBe('assistant')
    expect(owner.role).toBe('owner')
  })

  it('shows an assistant only their own account', async () => {
    await createOwner()
    const assistant = await payload.create({
      collection: 'users',
      data: { email: 'assistant@example.com', name: 'Assistant', password, role: 'assistant' },
      overrideAccess: true,
    })
    const visible = await payload.find({ collection: 'users', overrideAccess: false, user: assistant })
    expect(visible.docs.map((u) => u.email)).toEqual(['assistant@example.com'])
  })

  it('does not let an assistant delete accounts', async () => {
    const owner = await createOwner()
    const assistant = await payload.create({
      collection: 'users',
      data: { email: 'assistant@example.com', name: 'Assistant', password, role: 'assistant' },
      overrideAccess: true,
    })
    await expect(
      payload.delete({ collection: 'users', id: owner.id, overrideAccess: false, user: assistant }),
    ).rejects.toThrow(/not allowed/i)
  })

  it('locks login after five failed attempts', async () => {
    await createOwner()
    for (let attempt = 0; attempt < 5; attempt++) {
      await expect(
        payload.login({ collection: 'users', data: { email: 'owner@example.com', password: 'wrong' } }),
      ).rejects.toThrow()
    }
    await expect(
      payload.login({ collection: 'users', data: { email: 'owner@example.com', password } }),
    ).rejects.toThrow(/locked/i)
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm run test:int
```

Expected: FAIL, with several of the 7 new tests failing. The template's Users collection has no `role` field (`expected undefined to be 'owner'`), uses default access, and has no lockout.

- [ ] **Step 3: Implement** — replace `website/src/collections/Users.ts`

```ts
import type { Access, CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { ROLES, isOwner, ownerOnly, ownerOnlyField, ownerOrSelf } from '../access/roles'

const LOCK_TIME_MS = 15 * 60 * 1000
const SESSION_SECONDS = 8 * 60 * 60

const countUsers = async (req: Parameters<Access>[0]['req']): Promise<number> => {
  const { totalDocs } = await req.payload.count({ collection: 'users', overrideAccess: true, req })
  return totalDocs
}

// Anyone may create the very first account (it becomes the owner); after that only the owner can.
const ownerOrFirstUser: Access = async ({ req }) => {
  if (isOwner(req.user as { role?: 'owner' | 'assistant' } | null)) return true
  return (await countUsers(req)) === 0
}

const firstUserIsOwner: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  if ((await countUsers(req)) > 0) return data
  return { ...data, role: 'owner' }
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'role'],
  },
  auth: {
    maxLoginAttempts: 5,
    lockTime: LOCK_TIME_MS,
    tokenExpiration: SESSION_SECONDS,
    useAPIKey: true,
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  access: {
    create: ownerOrFirstUser,
    read: ownerOrSelf,
    update: ownerOrSelf,
    delete: ownerOnly,
  },
  hooks: {
    beforeChange: [firstUserIsOwner],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'assistant',
      saveToJWT: true,
      options: ROLES.map((role) => ({ label: role[0].toUpperCase() + role.slice(1), value: role })),
      access: {
        create: ownerOnlyField,
        update: ownerOnlyField,
      },
    },
  ],
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
npm run test:int
```

Expected: PASS, `8 passed` (database layout + users).

- [ ] **Step 5: Regenerate types, then verify and commit**

```bash
npm run generate:types
npm run lint && npm run typecheck && npm test
git add website
git commit -m "feat: add owner and assistant roles, first-user ownership and login lockout"
```

Expected: `npm test` shows the unit tests (11) and integration tests (8) passing.

---

### Task 8: Harden the schema against Supabase's public API

**Files:**

- Replace: `website/tests/int/database.int.spec.ts`
- Create: `website/src/lib/harden-database.ts`
- Create: `website/scripts/harden-database.ts`
- Modify: `website/package.json` (`db:harden` script)

- [ ] **Step 1: Write the failing tests** — replace `website/tests/int/database.int.spec.ts`

```ts
import { Pool } from 'pg'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { DB_SCHEMA } from '@/lib/db-schema'
import { hardenSchema } from '@/lib/harden-database'

let payload: Payload
let pool: Pool

describe('database layout', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  })

  afterAll(async () => {
    await pool.end()
    await payload.destroy()
  })

  it('keeps every Payload table in the dedicated schema, none in public', async () => {
    const { rows } = await pool.query<{ schemaname: string; tablename: string }>(
      `SELECT schemaname, tablename FROM pg_tables WHERE schemaname IN ('public', $1)`,
      [DB_SCHEMA],
    )
    const inSchema = rows.filter((r) => r.schemaname === DB_SCHEMA).map((r) => r.tablename)
    const inPublic = rows.filter((r) => r.schemaname === 'public').map((r) => r.tablename)

    expect(inSchema).toContain('users')
    expect(inPublic).toEqual([])
  })

  it('enables row-level security on every table after hardening', async () => {
    await hardenSchema(pool, DB_SCHEMA)
    const { rows } = await pool.query<{ relname: string; relrowsecurity: boolean }>(
      `SELECT c.relname, c.relrowsecurity
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relkind = 'r'`,
      [DB_SCHEMA],
    )
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.filter((r) => !r.relrowsecurity)).toEqual([])
  })

  it("revokes Supabase's API roles from the schema when they exist", async () => {
    for (const role of ['anon', 'authenticated']) {
      await pool.query(
        `DO $$ BEGIN
           IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
             CREATE ROLE ${role} NOLOGIN;
           END IF;
         END $$`,
      )
      await pool.query(`GRANT USAGE ON SCHEMA "${DB_SCHEMA}" TO ${role}`)
      await pool.query(`GRANT SELECT ON ALL TABLES IN SCHEMA "${DB_SCHEMA}" TO ${role}`)
    }

    await hardenSchema(pool, DB_SCHEMA)

    const { rows } = await pool.query<{ rolname: string; usage: boolean; can_select: boolean }>(
      `SELECT rolname,
              has_schema_privilege(rolname, $1, 'USAGE') AS usage,
              has_table_privilege(rolname, $2, 'SELECT') AS can_select
         FROM pg_roles WHERE rolname IN ('anon', 'authenticated')`,
      [DB_SCHEMA, `${DB_SCHEMA}.users`],
    )
    expect(rows).toHaveLength(2)
    expect(rows.filter((r) => r.usage || r.can_select)).toEqual([])
  })

  it('still lets Payload read and write after hardening', async () => {
    await hardenSchema(pool, DB_SCHEMA)
    const created = await payload.create({
      collection: 'users',
      data: {
        email: 'after-rls@example.com',
        name: 'After',
        password: 'correct-horse-battery-staple',
        role: 'assistant',
      },
      overrideAccess: true,
    })
    const found = await payload.findByID({ collection: 'users', id: created.id, overrideAccess: true })
    expect(found.email).toBe('after-rls@example.com')
    await payload.delete({ collection: 'users', id: created.id, overrideAccess: true })
  })
})
```

The test creates the `anon` and `authenticated` roles locally because they exist only on Supabase. That way the revoke path is exercised exactly as it will run in production.

- [ ] **Step 2: Run it and watch it fail**

```bash
npm run test:int
```

Expected: FAIL with `Failed to resolve import "@/lib/harden-database"`.

- [ ] **Step 3: Implement** — `website/src/lib/harden-database.ts`

```ts
import type { Pool } from 'pg'

// Supabase publishes a web API (PostgREST) for exposed schemas and grants its `anon` and
// `authenticated` roles access. Payload's tables must never be reachable that way, so we
// enable row-level security on every table in the schema (no policies = no rows for those
// roles) and revoke their privileges. Payload connects as the table owner, which RLS does
// not restrict. Roles that do not exist (e.g. plain local Postgres) are skipped.
const API_ROLES = ['anon', 'authenticated'] as const

export async function hardenSchema(pool: Pool, schema: string): Promise<void> {
  const { rows } = await pool.query<{ tablename: string }>(
    'SELECT tablename FROM pg_tables WHERE schemaname = $1',
    [schema],
  )
  for (const { tablename } of rows) {
    await pool.query(`ALTER TABLE "${schema}"."${tablename}" ENABLE ROW LEVEL SECURITY`)
  }

  const { rows: roles } = await pool.query<{ rolname: string }>(
    'SELECT rolname FROM pg_roles WHERE rolname = ANY($1)',
    [API_ROLES],
  )
  for (const { rolname } of roles) {
    await pool.query(`REVOKE ALL ON SCHEMA "${schema}" FROM "${rolname}"`)
    await pool.query(`REVOKE ALL ON ALL TABLES IN SCHEMA "${schema}" FROM "${rolname}"`)
    await pool.query(`REVOKE ALL ON ALL SEQUENCES IN SCHEMA "${schema}" FROM "${rolname}"`)
  }
}
```

The identifiers interpolated into SQL come only from `pg_tables`, `pg_roles` and the `DB_SCHEMA` constant, never from user input.

- [ ] **Step 4: Run it and watch it pass**

```bash
npm run test:int
```

Expected: PASS, `11 passed`.

- [ ] **Step 5: Add the command-line entry point** — `website/scripts/harden-database.ts`

```ts
import 'dotenv/config'
import { Pool } from 'pg'

import { DB_SCHEMA } from '../src/lib/db-schema'
import { parseServerEnv } from '../src/lib/env'
import { hardenSchema } from '../src/lib/harden-database'

const { DATABASE_URL } = parseServerEnv(process.env)
const pool = new Pool({ connectionString: DATABASE_URL })

try {
  await hardenSchema(pool, DB_SCHEMA)
  console.log(`Row-level security enabled on every table in schema "${DB_SCHEMA}".`)
} finally {
  await pool.end()
}
```

```bash
npm pkg set "scripts.db:harden=cross-env NODE_OPTIONS=--no-deprecation tsx scripts/harden-database.ts"
npm run db:harden
```

Expected: `Row-level security enabled on every table in schema "payload".` This runs against your local `sagevani` database.

- [ ] **Step 6: Verify and commit**

```bash
npm run lint && npm run typecheck && npm test
git add website
git commit -m "feat: enable row-level security and revoke Supabase API roles on the payload schema"
```

---

### Task 9: Initial migration that works on a fresh database

**Files:**

- Create: `website/src/migrations/<timestamp>_initial.ts`, `<timestamp>_initial.json`, `index.ts` (generated)
- Modify: the generated `<timestamp>_initial.ts` (one added line)
- Modify: `website/package.json` (`deploy:migrate`, `deploy:build` scripts)

- [ ] **Step 1: Create a scratch database and generate the migration against it**

Generate the migration against a database that development-mode push has never touched:

```bash
docker compose exec -T db psql -U postgres -c "CREATE DATABASE sagevani_migrate_check"
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/sagevani_migrate_check \
  npm run payload -- migrate:create initial
ls src/migrations
```

Expected: `Migration created at …src/migrations/<timestamp>_initial.ts`, and the listing shows `<timestamp>_initial.json`, `<timestamp>_initial.ts` and `index.ts`.

- [ ] **Step 2: See the migration fail on a fresh database**

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/sagevani_migrate_check \
  npm run payload -- migrate
```

Expected: `ERROR: Error running migration … caused by: error: schema "payload" does not exist`. The generated SQL creates tables in `payload` but never creates the schema.

- [ ] **Step 3: Make the migration create the schema first**

In `src/migrations/<timestamp>_initial.ts`, the `up` function starts with `await db.execute(sql\``. Add `CREATE SCHEMA IF NOT EXISTS "payload";` as the first statement inside that SQL, so that it begins:

```ts
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE SCHEMA IF NOT EXISTS "payload";
   CREATE TYPE "payload"."enum_users_role" AS ENUM('owner', 'assistant');
```

The same edit as a command:

```bash
sed -i '0,/await db.execute(sql`/s//await db.execute(sql`\n   CREATE SCHEMA IF NOT EXISTS "payload";/' src/migrations/*_initial.ts
head -6 src/migrations/*_initial.ts
```

- [ ] **Step 4: Add the deploy scripts**

```bash
npm pkg set "scripts.deploy:migrate=cross-env NODE_ENV=production NODE_OPTIONS=--no-deprecation payload migrate && npm run db:harden"
npm pkg set 'scripts.deploy:build=DATABASE_URL=${DATABASE_MIGRATION_URL:-$DATABASE_URL} npm run deploy:migrate && npm run build'
```

- `deploy:migrate` runs migrations with schema push disabled (`NODE_ENV=production`), then hardens the schema.
- `deploy:build` is what Netlify runs. It uses the session-pooler `DATABASE_MIGRATION_URL` for migrations when that's set, and the runtime `DATABASE_URL` for the app build. It uses POSIX shell syntax and runs on Netlify and in CI (Linux), not in Windows `cmd`.

- [ ] **Step 5: Verify on the fresh database, then drop it**

```bash
docker compose exec -T db psql -U postgres -c "DROP DATABASE sagevani_migrate_check WITH (FORCE)"
docker compose exec -T db psql -U postgres -c "CREATE DATABASE sagevani_migrate_check"
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/sagevani_migrate_check npm run deploy:migrate
docker compose exec -T db psql -U postgres -d sagevani_migrate_check -c \
  "SELECT n.nspname, count(*) FILTER (WHERE c.relrowsecurity) AS rls, count(*) AS total
     FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname IN ('payload', 'public') GROUP BY 1"
docker compose exec -T db psql -U postgres -c "DROP DATABASE sagevani_migrate_check WITH (FORCE)"
```

Expected:

- `Migrated: <timestamp>_initial`, then `Row-level security enabled on every table in schema "payload".`
- The query returns one row, `payload | 8 | 8`. All 8 tables have RLS, and nothing is in `public`.

- [ ] **Step 6: Commit**

```bash
npm run lint && npm run typecheck
git add website
git commit -m "feat: add initial migration that creates the payload schema, plus deploy scripts"
```

---

### Task 10: Create the owner account safely before first deploy

On a fresh staging or production database, the first account created becomes the owner. If the site went live before that account existed, a stranger could claim it at `/admin/create-first-user`. This command creates the owner from your own machine before Netlify ever serves the site.

**Files:**

- Create: `website/tests/int/create-owner.int.spec.ts`
- Create: `website/src/lib/create-owner.ts`
- Create: `website/scripts/create-owner.ts`
- Modify: `website/package.json` (`owner:create` script)

- [ ] **Step 1: Write the failing test** — `website/tests/int/create-owner.int.spec.ts`

```ts
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { createOwner } from '@/lib/create-owner'

let payload: Payload

const clearUsers = () =>
  payload.delete({ collection: 'users', where: { id: { exists: true } }, overrideAccess: true })

describe('createOwner', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  beforeEach(async () => {
    await clearUsers()
  })

  afterAll(async () => {
    await clearUsers()
    await payload.destroy()
  })

  it('creates the owner on an empty database', async () => {
    const owner = await createOwner(payload, {
      email: 'owner@example.com',
      name: 'Owner',
      password: 'long-enough-password',
    })
    expect(owner.role).toBe('owner')
  })

  it('refuses when any account already exists', async () => {
    await createOwner(payload, { email: 'owner@example.com', name: 'Owner', password: 'long-enough-password' })
    await expect(
      createOwner(payload, { email: 'second@example.com', name: 'Second', password: 'long-enough-password' }),
    ).rejects.toThrow('Refusing to create an owner: this database already has user accounts.')
  })

  it('refuses a password shorter than 12 characters', async () => {
    await expect(
      createOwner(payload, { email: 'owner@example.com', name: 'Owner', password: 'short' }),
    ).rejects.toThrow('The owner password must be at least 12 characters.')
  })
})
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm run test:int
```

Expected: FAIL with `Failed to resolve import "@/lib/create-owner"`.

- [ ] **Step 3: Implement** — `website/src/lib/create-owner.ts`

```ts
import type { Payload } from 'payload'

export const MIN_OWNER_PASSWORD_LENGTH = 12

export type OwnerInput = { email: string; name: string; password: string }

// Creates the single owner account on a fresh database, before the site is reachable,
// so nobody else can claim it through the first-user screen.
export async function createOwner(payload: Payload, input: OwnerInput) {
  if (input.password.length < MIN_OWNER_PASSWORD_LENGTH) {
    throw new Error(`The owner password must be at least ${MIN_OWNER_PASSWORD_LENGTH} characters.`)
  }
  const { totalDocs } = await payload.count({ collection: 'users', overrideAccess: true })
  if (totalDocs > 0) {
    throw new Error('Refusing to create an owner: this database already has user accounts.')
  }
  return payload.create({
    collection: 'users',
    data: { ...input, role: 'owner' },
    overrideAccess: true,
  })
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
npm run test:int
```

Expected: PASS, `14 passed`.

- [ ] **Step 5: Add the command-line entry point** — `website/scripts/create-owner.ts`

```ts
import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { createOwner } from '../src/lib/create-owner'

const { OWNER_EMAIL, OWNER_NAME, OWNER_PASSWORD } = process.env
if (!OWNER_EMAIL || !OWNER_NAME || !OWNER_PASSWORD) {
  console.error('Set OWNER_EMAIL, OWNER_NAME and OWNER_PASSWORD for this command.')
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  const owner = await createOwner(payload, {
    email: OWNER_EMAIL,
    name: OWNER_NAME,
    password: OWNER_PASSWORD,
  })
  console.log(`Owner account created for ${owner.email}.`)
  process.exitCode = 0
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await payload.destroy()
  // Payload keeps background handles open after destroy(); exit explicitly so the command ends.
  process.exit()
}
```

```bash
npm pkg set "scripts.owner:create=cross-env NODE_ENV=production NODE_OPTIONS=--no-deprecation tsx scripts/create-owner.ts"
```

`NODE_ENV=production` turns off development-mode schema push. Without it, the script stops at an interactive prompt on a migrated database.

- [ ] **Step 6: Check the command on a fresh, migrated scratch database**

```bash
docker compose exec -T db psql -U postgres -c "CREATE DATABASE sagevani_owner_check"
export DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/sagevani_owner_check
npm run deploy:migrate
OWNER_EMAIL=me@example.com OWNER_NAME=Owner OWNER_PASSWORD=long-enough-password npm run owner:create; echo "exit $?"
OWNER_EMAIL=x@example.com OWNER_NAME=X OWNER_PASSWORD=long-enough-password npm run owner:create; echo "exit $?"
unset DATABASE_URL
docker compose exec -T db psql -U postgres -c "DROP DATABASE sagevani_owner_check WITH (FORCE)"
```

Expected:

1. First run: `Owner account created for me@example.com.` and `exit 0`, within a few seconds.
2. Second run: `Refusing to create an owner: this database already has user accounts.` and a non-zero exit code.

- [ ] **Step 7: Verify and commit**

```bash
npm run lint && npm run typecheck && npm test
git add website
git commit -m "feat: add owner:create command to claim the owner account before first deploy"
```

---

### Task 11: Smoke tests in a real browser

**Files:**

- Create: `website/tests/e2e/smoke.e2e.spec.ts`

The placeholder page from Task 2 already exists, so these tests describe current behaviour and guard it from now on.

- [ ] **Step 1: Write the tests** — `website/tests/e2e/smoke.e2e.spec.ts`

```ts
import { expect, test } from '@playwright/test'

test('home page shows the SageVani name', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('SageVani')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('SageVani')
})

test('admin asks for an email to sign in or create the first account', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/(login|create-first-user)/)
  await expect(page.locator('input[name="email"]')).toBeVisible()
})
```

- [ ] **Step 2: Install the browser and run**

```bash
npx playwright install chromium
npm run test:e2e
```

Expected: `2 passed`. The first run takes about 20 seconds, because the dev server compiles the admin.

- [ ] **Step 3: Commit**

```bash
npm run lint && npm run typecheck
git add website
git commit -m "test: add browser smoke tests for the home page and admin sign-in"
```

---

### Task 12: Full local verification

**Files:** none (verification only)

- [ ] **Step 1: Tests with the coverage gate**

```bash
npm run db:reset
npm run test:coverage
```

Expected:

- `Tests  25 passed (25)`
- The coverage table shows 100% for `access/roles.ts`, `collections/Users.ts`, `lib/env.ts`, `lib/db-schema.ts`, `lib/harden-database.ts` and `lib/create-owner.ts`.
- No threshold errors.

- [ ] **Step 2: Lint, typecheck, production build**

```bash
npm run lint && npm run typecheck && npm run build
```

Expected: the build route table lists `○ /` (static) and `ƒ /admin/[[...segments]]` and `ƒ /api/[...slug]` (dynamic).

- [ ] **Step 3: If anything changed, commit it. Otherwise move on.**

```bash
git status --short
```

---

### Task 13: Continuous integration on GitHub Actions

**Files:**

- Create: `.github/workflows/website-ci.yml` (repository root)

- [ ] **Step 1: Create `.github/workflows/website-ci.yml`**

```yaml
name: Website CI

on:
  push:
    branches: [main]
    paths: ['website/**', '.github/workflows/website-ci.yml']
  pull_request:
    paths: ['website/**', '.github/workflows/website-ci.yml']

concurrency:
  group: website-ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    defaults:
      run:
        working-directory: website
    services:
      postgres:
        image: postgres:17
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: sagevani_test
        ports: ['5432:5432']
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 10
    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/sagevani_test
      PAYLOAD_SECRET: ci-only-secret-not-used-anywhere-else-0123456789
    steps:
      - uses: actions/checkout@v5

      - uses: actions/setup-node@v5
        with:
          node-version: 24
          cache: npm
          cache-dependency-path: website/package-lock.json

      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:coverage

      - name: Migrate a fresh database and build, exactly as Netlify will
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/sagevani_deploy
        run: |
          psql postgres://postgres:postgres@localhost:5432/postgres -c "CREATE DATABASE sagevani_deploy"
          npm run deploy:build

      - name: Install the Playwright browser
        if: github.event_name == 'pull_request'
        run: npx playwright install --with-deps chromium

      - name: Browser smoke tests
        if: github.event_name == 'pull_request'
        run: npm run test:e2e
```

- [ ] **Step 2: Commit, push and open the pull request (from the repository root)**

```bash
git add .github/workflows/website-ci.yml
git commit -m "ci: lint, typecheck, test, migrate-and-build and smoke-test the website"
git push -u origin feat/website-foundation
gh pr create --base main --head feat/website-foundation \
  --title "Website stage 1: foundation" \
  --body "Implements build stage 1 of website/docs/specs/2026-10-05-sagevani-website-design.md following website/docs/plans/2026-10-05-stage-1-foundation.md."
```

- [ ] **Step 3: Wait for CI**

```bash
gh pr checks --watch
```

Expected: `verify` passes. If `deploy:build` fails, read the log step by step. That step reproduces the first Netlify deploy, so fix the cause here, never on Netlify.

---

### Task 14: Netlify configuration and the environment guide

**Files:**

- Create: `netlify.toml` (repository root)
- Create: `website/docs/environments.md`
- Modify: `website/README.md`

- [ ] **Step 1: Create `netlify.toml`**

```toml
# Netlify builds the Next.js app in website/. Deploy-context environment variables
# (production vs previews) are set in the Netlify UI — see website/docs/environments.md.
[build]
  base = "website"
  command = "npm run deploy:build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "24"
```

- [ ] **Step 2: Create `website/docs/environments.md`**

```markdown
# Environments

| Environment | App | Database | Schema changes |
| --- | --- | --- | --- |
| Local | `npm run dev` | Postgres 17 in Docker (`npm run db:up`) | Automatic push in development |
| Preview | Netlify deploy preview per branch | Supabase **staging** project | Migrations on each deploy |
| Production | Netlify production | Supabase **production** project | Migrations on each deploy |

## Variables

| Variable | Where | Value |
| --- | --- | --- |
| `DATABASE_URL` | Local, Netlify | Local: `postgres://postgres:postgres@127.0.0.1:54329/sagevani`. Netlify: the Supabase **transaction pooler** connection string (port 6543) |
| `DATABASE_MIGRATION_URL` | Netlify | The Supabase **session pooler** connection string (port 5432), used only for migrations during the build |
| `PAYLOAD_SECRET` | Local, Netlify | At least 32 random characters, different for each environment: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

Never commit `.env`. `.env.test` holds test-only values and is committed on purpose.

## Run locally

1. Start Docker Desktop.
2. In `website/`: `npm install`, then `cp .env.example .env` and set `PAYLOAD_SECRET`.
3. `npm run db:up`, then `npm run dev`, and open http://localhost:3000/admin. The first account you create locally becomes the owner.
4. Run the tests with `npm test`, coverage with `npm run test:coverage`, and the browser tests with `npm run test:e2e`.
5. `npm run db:reset` wipes both local databases.

## Set up staging and production (owner)

Do these steps in order. Step 4 must happen before step 5, so that nobody can claim the owner account on a live site.

1. **Supabase:** create two projects, `sagevani-staging` (free plan) and `sagevani-production` (Pro plan), in the agreed region. For each one, copy the transaction pooler and session pooler connection strings from the project's Connect panel.
2. **Supabase web API:** in each project's API settings, check that `payload` is **not** in the list of exposed schemas. The site never uses Supabase's web API, so you can also turn it off.
3. **Migrate each database from your machine** (in `website/`, Git Bash):
   `DATABASE_URL="<session pooler URL>" npm run deploy:migrate`
4. **Create your owner account in each database:**
   `DATABASE_URL="<session pooler URL>" OWNER_EMAIL="you@…" OWNER_NAME="…" OWNER_PASSWORD="<12+ characters>" npm run owner:create`
5. **Netlify:**
   - Add a new site from the GitHub repository `shashesh/sagevani`. Build settings come from `netlify.toml`.
   - Under environment variables, set `DATABASE_URL`, `DATABASE_MIGRATION_URL` and `PAYLOAD_SECRET` with production values for the **Production** context, and staging values for **Deploy Previews** and **Branch deploys**.
6. Deploy, open `/admin` on the Netlify address, and sign in with the owner account from step 4.
```

- [ ] **Step 3: Add a "Develop" section to `website/README.md`**

Append to the end of `website/README.md`:

```markdown
## Develop

The app is a Payload CMS 3 + Next.js 16 project in this folder. See [environments](docs/environments.md) for local setup, variables, and staging/production setup.
```

- [ ] **Step 4: Commit and push**

```bash
git add netlify.toml website/docs/environments.md website/README.md
git commit -m "docs: add Netlify build settings and the environment setup guide"
git push
```

---

### Task 15: [OWNER] Create staging and production, and deploy

Follow `website/docs/environments.md`, "Set up staging and production", steps 1 to 6. Each step needs the owner's accounts and decisions:

- **Database region.** Mumbai is proposed in the spec (section 18, item 6); the owner confirms it.
- **The Supabase Pro plan** for production (item 7).

An agent may walk the owner through these steps but must not create accounts, enter secrets, or start deploys itself.

- [ ] **Step 1:** Supabase projects exist, and `payload` is not an exposed schema in either.
- [ ] **Step 2:** `deploy:migrate` succeeded on staging and on production.
- [ ] **Step 3:** `owner:create` succeeded on staging and on production.
- [ ] **Step 4:** The Netlify site is connected, with variables scoped per deploy context.
- [ ] **Step 5:** A deploy preview of this pull request builds, and signing in at `<preview URL>/admin` works.

**If the first Netlify build fails:**

- Compare its log with the CI `deploy:build` step, which runs the same command.
- If Netlify can't bundle the Payload app, for example because a function exceeds the size limit or `sharp` fails, stop and raise it with the owner before trying workarounds. Vercel is the documented fallback host for Payload.

---

### Task 16: Review and merge

- [ ] **Step 1: Independent reviews**

Run the `code-reviewer` agent and the `security-reviewer` agent on `git diff main...feat/website-foundation`. The security review must cover `src/access/`, `src/collections/Users.ts`, `src/lib/harden-database.ts`, `src/lib/create-owner.ts` and the CI secrets handling. Fix every CRITICAL and HIGH finding, re-run `npm run lint && npm run typecheck && npm run test:coverage`, then commit and push.

- [ ] **Step 2: Record progress in the workspace (from the repository root)**

- In `docs/operations/tasks.md`, under "Next work after clarification", change `- [ ] Build website stage 1 (foundation).` to `- [x] Build website stage 1 (foundation).` and add `- [ ] Plan website stage 2 (content model and admin).`
- In `CHANGELOG.md`, add an entry at the top: `## YYYY-MM-DD — Website stage 1: foundation` (use the date you finish), listing the Payload app, the roles, schema hardening, migrations, the owner command, CI and the Netlify settings.

```bash
git add docs/operations/tasks.md CHANGELOG.md
git commit -m "docs: record website stage 1 completion"
git push
```

- [ ] **Step 3: [OWNER] Merge**

Once CI is green and the owner has reviewed the PR, the owner merges it (or tells the agent to run `gh pr merge --squash --delete-branch`).

---

## Spec coverage (stage 1)

| Spec requirement | Task |
| --- | --- |
| §4 one Next.js + Payload app in `website/` | 2 |
| §4 dedicated `payload` schema, RLS as a second lock | 6, 8, 9 |
| §4 connection through Supabase's transaction pooler | 14 (variables), 15 |
| §5.3 users: owner/assistant roles, lockout, API keys for assistant | 5, 7 |
| §8.1 only the owner can publish (role foundation for stage 2) | 5, 7 |
| §9 secrets only in environment, checked at startup | 4, 13, 14 |
| §9 admin login lockout, secure cookies | 7 |
| §13 unit, integration, e2e tests; CI; 80% coverage | 3–13 |
| §14 local, preview and production environments; committed migrations applied on deploy | 2, 9, 13, 14, 15 |
| §16 stage 1: CI, environments, env checks | all |

Deferred to later stages, as in the spec: content collections, Supabase Storage for media, the public design system, reader interactions, search, analytics, email, security headers, Sentry.
