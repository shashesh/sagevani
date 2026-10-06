# Environments

| Environment | App | Database | Schema changes |
| --- | --- | --- | --- |
| Local | `npm run dev` | Postgres 17 in Docker (`npm run db:up`) | Automatic push in development |
| Preview | Netlify deploy previews (one per pull request) and branch deploys | Supabase **staging** project | Run by the owner from their machine |
| Production | Netlify production (the `main` branch) | Supabase **production** project | Every production deploy migrates, hardens, then builds |

Previews only build. Migrations run with database-owner credentials, so unreviewed branch code never gets them. When a pull request adds a migration, apply it to staging yourself before you check that pull request's preview (see [Migrate and create the owner](#3-migrate-and-create-the-owner)).

## Variables

| Variable | Used by | Value |
| --- | --- | --- |
| `DATABASE_URL` | The app, and every command | Local: `postgres://postgres:postgres@127.0.0.1:54329/sagevani`. Netlify: the Supabase **transaction pooler** URL (port 6543) of the matching project |
| `PAYLOAD_SECRET` | The app, and every command | At least 32 random characters, different for each environment: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_CA_CERT` | The app, and every command that connects to Supabase | Supabase's certificate authority, from the project's **Database → SSL Configuration** settings (**Download certificate**). Not needed for the local database |
| `DATABASE_MIGRATION_URL` | Netlify **production** builds only | The production Supabase **session pooler** URL (port 5432), used only to migrate |

Never commit `.env`. `.env.test` holds test-only values and is committed on purpose.

Rules for these values:

- **No `sslmode` in any URL.** The app refuses to start if a URL has one. TLS is set up in code: every connection to Supabase is encrypted and checked against `DATABASE_CA_CERT`. A `sslmode` in the URL would silently replace those settings.
- **The certificate can be multi-line or on one line.** Netlify's form doesn't always keep line breaks, so the app also accepts one line with literal `\n` escapes. This command prints the certificate in that form:

  ```bash
  awk '{printf "%s\\n", $0}' prod-ca-2021.crt
  ```

  If the value isn't a PEM certificate, the app refuses to start and says so.
- **Use only letters and digits in the Supabase database password.** Other characters must be URL-encoded inside the connection strings, which is easy to get wrong.
- **Use the pooler URLs, not the direct connection.** Supabase's direct database host may not be reachable over IPv4.
- **Don't set `NODE_ENV`** in Netlify. It would make the install skip development dependencies, such as `tsx`, which the hardening step needs.

## Run locally

1. Start Docker Desktop.
2. In `website/`: `npm install`, then `cp .env.example .env` and set `PAYLOAD_SECRET`.
3. `npm run db:up`, then `npm run dev`, and open <http://localhost:3000/admin>. The first account you create locally becomes the owner. Sign-up like this works only in development.
4. Run the tests with `npm test`, coverage with `npm run test:coverage`, and the browser tests with `npm run test:e2e`.
5. `npm run db:reset` wipes both local databases.
6. The dev server builds the local database by "pushing" the schema directly. If you later run `payload migrate` against that same database, Payload asks before it risks data loss. Answer no, and test migrations on a fresh database instead (`db:reset`, or a scratch database).

Rolling back production means restoring a Supabase backup. A migration's `down()` drops every table, so never run it against real data.

## Set up staging and production (owner)

Do these steps in order. The owner account must exist before the site is reachable, so that nobody else can claim it.

### 1. Create the Supabase projects

- Create `sagevani-staging` (free plan) and `sagevani-production` (Pro plan) in the region you choose.
- For each one, from the project's **Connect** panel, copy the **transaction pooler** URL (port 6543) and the **session pooler** URL (port 5432).
- Download the CA certificate from **Database → SSL Configuration**.

### 2. Close Supabase's web API to Payload's tables

- In each project's API settings, check that `payload` is **not** in the list of exposed schemas.
- The site never uses Supabase's web API, so you can also turn it off.

### 3. Migrate and create the owner

Do this once for each project, from `website/` in Git Bash. `read -rs` keeps each value off the screen and out of your shell history.

1. Load that environment's values into the shell. At each `read -rs` prompt, paste the value and press Enter.

   ```bash
   export DATABASE_CA_CERT="$(cat ~/Downloads/prod-ca-2021.crt)"
   read -rs DATABASE_URL; export DATABASE_URL       # the session pooler URL
   read -rs PAYLOAD_SECRET; export PAYLOAD_SECRET   # this environment's secret
   ```

2. Apply the migrations and harden the schema:

   ```bash
   npm run deploy:migrate
   ```

   It should end with `Row-level security enabled on every table in schema "payload".`

3. Create your owner account. Use a **different password for staging and production**.

   ```bash
   read -rs OWNER_PASSWORD; export OWNER_PASSWORD
   OWNER_EMAIL="you@…" OWNER_NAME="…" npm run owner:create
   unset OWNER_PASSWORD
   ```

   Password rules:
   - It needs at least 12 characters.
   - It can't be a single repeated character.
   - It can't contain the part of your email before the `@`, or your name.

   Never put `OWNER_PASSWORD` in `.env`.

4. In the project's SQL editor, run `select * from pg_default_acl` and note any entries for `anon` or `authenticated`.
   - The hardening step revokes the schema-level defaults.
   - Revoking schema access is the main lock either way.
5. Clear the shell (`unset DATABASE_URL PAYLOAD_SECRET DATABASE_CA_CERT`), or close the terminal.

Later, whenever a pull request adds a migration, repeat steps 1, 2 and 5 against staging from that branch.

### 4. Connect Netlify

1. Add a new site from the GitHub repository `shashesh/sagevani`. Build settings come from `netlify.toml`.
2. Under **Project configuration → Environment variables**, set:

   | Variable | Production | Deploy Previews and Branch deploys |
   | --- | --- | --- |
   | `DATABASE_URL` | Production transaction pooler URL | Staging transaction pooler URL |
   | `PAYLOAD_SECRET` | Production secret | Staging secret |
   | `DATABASE_CA_CERT` | The certificate | The certificate |
   | `DATABASE_MIGRATION_URL` | Production session pooler URL | Not set |

   - Tick **Contains secret values** for `DATABASE_URL`, `DATABASE_MIGRATION_URL` and `PAYLOAD_SECRET`. Netlify then masks them, and fails a build that would expose them in the code or the build output.
   - Builds need these values as well as the running site, because `next build` loads the configuration. Netlify's free plan makes every variable available to both. On a plan with scopes, give `DATABASE_MIGRATION_URL` the **Builds** scope only.
   - A production deploy without `DATABASE_MIGRATION_URL` stops with `Set DATABASE_MIGRATION_URL to the Supabase session-pooler URL`.
3. Before the first deploy, set:
   - **Deploy log visibility: Private logs.** The repository is public, and Netlify makes deploy logs public by default for public repositories.
   - **Sensitive variable policy: Require approval.** This is the default. It keeps pull requests from people outside your Netlify team, including forks, from building with your variables until you approve them.
   - **Project visibility for previews: Private,** under **Project configuration → General → Visitor access → Project visibility.** Previews connect to the staging database, so only you should see them. Keep production private as well until launch.
4. The open pull request's deploy preview builds against staging. Open `/admin` on the preview address and sign in with the staging owner account.
5. Merging to `main` triggers the first production deploy. Sign in at `/admin` with the production owner account.

## Recover the owner account

Use this if the owner password is lost, or may be known to someone else. Prepare the shell as in [step 3.1](#3-migrate-and-create-the-owner) with that environment's session pooler URL, then:

```bash
read -rs OWNER_PASSWORD; export OWNER_PASSWORD   # the new password
npm run owner:reset-password
unset OWNER_PASSWORD
```

The command does four things:

- It sets the new password, under the same rules as `owner:create`.
- It signs out every session.
- It removes any API key on the owner account. There shouldn't be one, because the owner can't be given an API key.
- It clears a login lock.

Five failed sign-ins lock an account for 15 minutes. A reset ends the current lock, but it can't stop someone from trying again. Rate limits on sign-in are planned for stage 6.

## Later hardening

The migrations and the running site both connect as Supabase's `postgres` role. A tighter setup would give the site its own database role that can read and write the `payload` tables but can't change the schema. Stage 1 doesn't set this up.
