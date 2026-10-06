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

Notes for the Netlify variables:

- **Builds need these values too.** Netlify runs migrations and `next build` during the build, so `DATABASE_URL`, `DATABASE_MIGRATION_URL` and `PAYLOAD_SECRET` must be available to **Builds** as well as Functions.
- **Require TLS.** Add `?sslmode=require` to both Supabase URLs. The `pg` driver only uses TLS when the URL asks for it.
- **Always set `DATABASE_MIGRATION_URL`** for every deploy context. If it is missing, migrations silently fall back to the transaction pooler, which can fail on schema changes.
- **Don't set `NODE_ENV`** in Netlify's environment. It would make the install skip development dependencies, such as `tsx`, which the hardening step needs.

## Run locally

1. Start Docker Desktop.
2. In `website/`: `npm install`, then `cp .env.example .env` and set `PAYLOAD_SECRET`.
3. `npm run db:up`, then `npm run dev`, and open http://localhost:3000/admin. The first account you create locally becomes the owner.
4. Run the tests with `npm test`, coverage with `npm run test:coverage`, and the browser tests with `npm run test:e2e`.
5. `npm run db:reset` wipes both local databases.
6. The dev server builds the local database by "pushing" the schema directly. If you later run `payload migrate` against that same database, Payload asks before it risks data loss. Answer no, and test migrations on a fresh database instead (`db:reset`, or a scratch database).

Rolling back production means restoring a Supabase backup. A migration's `down()` drops every table, so never run it against real data.

## Set up staging and production (owner)

Do these steps in order. Step 4 must happen before step 5, so that nobody can claim the owner account on a live site.

1. **Supabase:** create two projects, `sagevani-staging` (free plan) and `sagevani-production` (Pro plan), in the agreed region. For each one, copy the transaction pooler and session pooler connection strings from the project's Connect panel.
2. **Supabase web API:** in each project's API settings, check that `payload` is **not** in the list of exposed schemas. The site never uses Supabase's web API, so you can also turn it off. After step 3, run `select * from pg_default_acl` in each project's SQL editor and note any entries for `anon` or `authenticated`. The hardening step revokes schema-level defaults, and revoking schema USAGE is the primary lock either way.
3. **Migrate each database from your machine** (in `website/`, Git Bash):
   `DATABASE_URL="<session pooler URL>" npm run deploy:migrate`
4. **Create your owner account in each database.** Enter the password with `read -rs`, so it never appears on screen or in your shell history:

   ```bash
   read -rs OWNER_PASSWORD; export OWNER_PASSWORD
   DATABASE_URL="<session pooler URL>" OWNER_EMAIL="you@…" OWNER_NAME="…" npm run owner:create
   unset OWNER_PASSWORD
   ```

   The password needs at least 12 characters. It can't be a single repeated character, and it can't contain the part of your email before the `@`, or your name.

   - Never put `OWNER_PASSWORD` in `.env`.
   - The Supabase URL contains your database password. If that password has special characters, URL-encode them.
   - Afterwards, remove any history lines that contain the URL.
5. **Netlify:**
   - Add a new site from the GitHub repository `shashesh/sagevani`. Build settings come from `netlify.toml`.
   - Under environment variables, set `DATABASE_URL`, `DATABASE_MIGRATION_URL` and `PAYLOAD_SECRET` with production values for the **Production** context, and staging values for **Deploy Previews** and **Branch deploys**.
6. Deploy, open `/admin` on the Netlify address, and sign in with the owner account from step 4.
