# Environments

| Environment | App | Database | Schema changes |
| --- | --- | --- | --- |
| Local | `npm run dev` | Postgres 17 in Docker (`npm run db:up`) | Automatic push in development |
| Hosted | Netlify production (the `master` branch), deploy previews (one per pull request) and branch deploys | The single Supabase `sagevani` project | Production deploys migrate, harden, then build. Previews and branch deploys only build |

There's one hosted Supabase project ([D-007](../../docs/governance/decisions.md#d-007--one-environment-production-only)). A deploy preview builds and reads against this same project, live, so it isn't a safe place to try something destructive.

Previews and branch deploys still only build; they never run migrations. When a pull request adds a migration, apply it by hand first (see [Migrate and create the owner](#2-migrate-and-create-the-owner)), then check that pull request's preview.

## Variables

| Variable | Used by | Value |
| --- | --- | --- |
| `DATABASE_URL` | The app, and every command | Local: `postgres://postgres:postgres@127.0.0.1:54329/sagevani`. Netlify: the Supabase **transaction pooler** URL (port 6543) |
| `PAYLOAD_SECRET` | The app, and every command | At least 32 random characters: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_CA_CERT` | The app, and every command that connects to Supabase | Supabase's certificate authority, from the project's **Database → SSL Configuration** settings (**Download certificate**). Not needed for the local database |
| `DATABASE_MIGRATION_URL` | Netlify **production** builds only | The Supabase **session pooler** URL (port 5432), used only to migrate |
| `MEDIA_S3_ENDPOINT` | The app | The project's Storage S3 endpoint, from **Storage → S3 Configuration**, e.g. `https://<ref>.storage.supabase.co/storage/v1/s3`. Not set locally |
| `MEDIA_S3_REGION` | The app | The region shown next to the endpoint, e.g. `us-east-2` |
| `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY` | The app | An S3 access key pair created on the same page |
| `MEDIA_S3_BUCKET` | The app | `media` |
| `MEDIA_PUBLIC_URL` | The app | `https://<ref>.supabase.co/storage/v1/object/public/media` |
| `SITE_URL` | The app | The site's address, such as `https://<site>.netlify.app` until the domain is bought. No path or trailing slash. Not set locally. Required in every hosted context, not just production |
| `SITE_INDEXING` | The app | `on` to let search engines index the site. Set it in the Production context only, at launch; leave it unset everywhere else |

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
- **Set all six media variables or none.** Locally, leave them empty and uploads go to `website/uploads/`. For a database that isn't local they're required, because Netlify's functions have no lasting disk.
- **`MEDIA_PUBLIC_URL` must be an https address with no `?` or `#`.** The app refuses to start otherwise.
- **Don't set `NODE_ENV`** in Netlify. It would make the install skip development dependencies, such as `tsx`, which the hardening step needs.
- **SITE_URL is required on hosted sites.** A page that renders without it fails, so a deploy without it fails its build. The owner's scripts don't need it.
- **Apply a pull request's migrations before its preview builds.** From stage 3, the build renders pages from the database, so a preview whose migration isn't applied fails to build. Apply it, then retry the deploy.
- **`@netlify/plugin-nextjs` must actually run.** Auto-detection didn't reliably invoke it on real Netlify CI builds once a custom `publish` path was set, which silently deployed the raw `.next` folder with no functions and 404'd every route. `netlify.toml` now pins it explicitly under `[[plugins]]`. Check the deploy log shows `@netlify/plugin-nextjs` 5.16.2 or later and a "Functions bundling" step — not just a "Using Next.js Runtime" banner.

## Run locally

1. Start Docker Desktop.
2. In `website/`: `npm install`, then `cp .env.example .env` and set `PAYLOAD_SECRET`.
3. `npm run db:up`, then `npm run dev`, and open <http://localhost:3000/admin>. The first account you create locally becomes the owner. Sign-up like this works only in development.
4. Run the tests with `npm test`, coverage with `npm run test:coverage`, and the browser tests with `npm run test:e2e`. The browser tests always start their own server on port 3100 against the test database and empty it first, so they never touch your dev database.
5. `npm run db:reset` wipes both local databases.
6. The dev server builds the local database by "pushing" the schema directly. If you later run `payload migrate` against that same database, Payload asks before it risks data loss. Answer no, and test migrations on a fresh database instead (`db:reset`, or a scratch database).

Rolling back means restoring a Supabase backup. A migration's `down()` drops every table, so never run it against real data.

## Set up the hosted environment (owner)

Do these steps in order. The owner account must exist before the site is reachable, so that nobody else can claim it.

### 1. Create the Supabase project

- Create `sagevani` in its own organization, on the free plan.
- Choose the **East US (Ohio)** region. Netlify runs the site's server code in US East (Ohio) by default, and every page render queries the database. Readers anywhere in the world are served through Netlify's global network.
- From the project's **Connect** panel, copy the **transaction pooler** URL (port 6543) and the **session pooler** URL (port 5432).
- Download the CA certificate from **Database → SSL Configuration**.
- Create the media bucket:
  - **Storage → New bucket**, named `media`, with **Public bucket** on. Images load straight from it.
  - Leave the bucket's policies empty. Anonymous visitors can then fetch a file by its address but can't list the bucket, so an image used only in a draft stays out of sight.
  - **Storage → S3 Configuration**: note the endpoint and region, and create an access key pair. Keep the secret like a password.
- In the project's API settings, check that `payload` is **not** in the list of exposed schemas. The site never uses Supabase's web API, so you can also turn it off.

### 2. Migrate and create the owner

From `website/` in Git Bash. `read -rs` keeps each value off the screen and out of your shell history.

1. Load the values into the shell. At each `read -rs` prompt, paste the value and press Enter.

   ```bash
   export DATABASE_CA_CERT="$(cat ~/Downloads/prod-ca-2021.crt)"
   read -rs DATABASE_URL; export DATABASE_URL       # the session pooler URL
   read -rs PAYLOAD_SECRET; export PAYLOAD_SECRET
   ```

2. Apply the migrations and harden the schema:

   ```bash
   npm run deploy:migrate
   ```

   It should end with `Row-level security enabled on every table in schema "payload".`

3. Create your owner account:

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

Later, whenever a pull request adds a migration, repeat steps 1, 2 and 5 against this project from that branch, before checking its preview.

### 3. Connect Netlify

1. Add a new site from the GitHub repository `shashesh/sagevani`. Build settings come from `netlify.toml`.
2. In the import screen, before you deploy, add the variables below. You can change them later under **Project configuration → Environment variables**. If the first build starts without them, it fails without publishing anything; add them, then trigger the deploy again.

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Transaction pooler URL |
   | `PAYLOAD_SECRET` | The secret generated above |
   | `DATABASE_CA_CERT` | The certificate |
   | `DATABASE_MIGRATION_URL` | Session pooler URL (production builds only need it, but setting it everywhere is harmless) |
   | `MEDIA_S3_ENDPOINT`, `MEDIA_S3_REGION` | The project's values |
   | `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY` | The key pair |
   | `MEDIA_S3_BUCKET` | `media` |
   | `MEDIA_PUBLIC_URL` | The bucket's public address |
   | `SITE_URL` | The site's address, in every context |

   - Tick **Contains secret values** for `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `PAYLOAD_SECRET` and `MEDIA_S3_SECRET_ACCESS_KEY`. Netlify then masks them, and fails a build that would expose them in the code or the build output.
   - Builds need these values as well as the running site, because `next build` loads the configuration. Netlify's free plan makes every variable available to both. On a plan with scopes, give `DATABASE_MIGRATION_URL` the **Builds** scope only.
   - A production deploy without `DATABASE_MIGRATION_URL` stops with `Set DATABASE_MIGRATION_URL to the Supabase session-pooler URL`.
3. As soon as the site exists, set:
   - **Deploy log visibility: Private logs.** The repository is public, and Netlify makes deploy logs public by default for public repositories. Values marked secret are masked in the logs either way.
   - **Sensitive variable policy: Require approval.** This is the default. It keeps pull requests from people outside your Netlify team, including forks, from building with your variables until you approve them.
   - **Project visibility: Private**, under **Project configuration → General → Visitor access → Project visibility.** Make it public at launch.
4. When the production deploy finishes, open `/admin` on the site's address and sign in with the owner account.
5. Check that the deploy log shows `@netlify/plugin-nextjs` 5.16.2 or later, and a "Functions bundling" step.

## Backups

There are no automatic backups on the free plan, and free projects pause after a week without activity (resume from the Supabase dashboard; a paused project can be restored for 90 days). Once there are real drafts worth keeping, back them up yourself.

To back up, use Git Bash with Docker Desktop running, from a folder **outside this repository**. The backup contains your drafts, your account email and a password hash, so keep it private and never commit it.

1. Prepare the shell as in [step 2.1](#2-migrate-and-create-the-owner), with the **session pooler** URL.
2. Run:

   ```bash
   docker run --rm -e DATABASE_URL -e DATABASE_CA_CERT postgres:17 sh -c \
     'echo "$DATABASE_CA_CERT" > /tmp/ca.crt && PGSSLMODE=verify-full PGSSLROOTCERT=/tmp/ca.crt pg_dump "$DATABASE_URL" --schema=payload --no-owner --no-privileges' \
     > "sagevani-backup-$(date +%F).sql"
   ```

How the command works:

- The connection is encrypted, and it is refused if the server's certificate doesn't match Supabase's CA.
- The `postgres` image version must be the same as, or newer than, the project's Postgres version, which Supabase shows in its settings.

At launch, upgrade the organization to Pro in its billing settings. Daily backups and no pausing start then.

## Recover the owner account

Use this if the owner password is lost, or may be known to someone else. Prepare the shell as in [step 2.1](#2-migrate-and-create-the-owner) with the session pooler URL, then:

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

## Setup history

- 2026-10-19: a staging project and a production project were set up and verified separately. [D-007](../../docs/governance/decisions.md#d-007--one-environment-production-only) later collapsed them into the single hosted project described above; the original staging project is now that project, renamed.
