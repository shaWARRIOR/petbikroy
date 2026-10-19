# Deploying PetBikroy to Cloudflare Pages

This project is a complete, working marketplace: a static front end, a REST API,
a database, image storage, and an admin panel. Everything runs on Cloudflare's
free tier — no server to rent, no build step, no secrets to generate.

Read **Quick start** if you want the shortest path from here to a live site.
The sections after it explain each piece, how to run the whole thing locally,
and what to do when something goes wrong.

---

## What actually gets deployed

| Piece | Where it lives | What Cloudflare calls it |
|---|---|---|
| Front end (7 pages) | `public/` | Pages static assets |
| Admin panel | `public/admin/` | Pages static assets |
| API (19 routes) | `functions/` | Pages Functions |
| Database (12 tables) | `db/schema.sql` | D1 |
| Photo storage | — | R2 |

`functions/` is *not* served as files. Cloudflare compiles it into a Worker and
routes requests to it. Only `public/` is ever downloadable, which is why
`wrangler.toml`, `db/` and `tests/` sit outside it.

### API surface

```
GET    /api/ads              list, filter, sort, paginate
POST   /api/ads              create (returns a one-time owner token)
GET    /api/ads/:id          detail, including the seller's phone number
PUT    /api/ads/:id          edit   (owner token or admin session)
DELETE /api/ads/:id          remove (owner token or admin session)
POST   /api/ads/:id/view     count a view (de-duplicated per visitor per day)
GET    /api/taxonomy         categories, breeds, divisions, areas
GET    /api/facets           live counts for the sidebar filters
GET    /api/stats            homepage counters
POST   /api/upload           photo upload to R2
GET    /img/*                serve a photo from R2
POST   /api/reports          report an ad

POST   /api/admin/session    sign in / out
GET    /api/admin/overview   dashboard numbers
GET    /api/admin/ads        every ad, any status
PUT    /api/admin/ads/:id    approve, reject, feature, edit
GET    /api/admin/reports    the report queue
PUT    /api/admin/reports    resolve or dismiss a report
GET|PUT /api/admin/settings  site settings
GET|POST /api/admin/admins   staff accounts
PUT|DELETE /api/admin/admins/:id
```

### How admin login works

There is no session secret to configure. Passwords are hashed with PBKDF2-SHA256
(25,000 iterations) and a per-account salt; session tokens are random 256-bit
values, stored in the database as SHA-256 hashes and delivered in an
`HttpOnly; Secure; SameSite=Strict` cookie. Nothing sensitive is stored in
plain text anywhere, so there is no key to leak or rotate.

### How "my ads" works without user accounts

Buyers and sellers never register. When someone posts an ad, `POST /api/ads`
returns a one-time **owner token**. The browser keeps it in `localStorage` and
sends it back in the `x-owner-token` header to edit or delete that one ad. The
server stores only its SHA-256 hash, so a database dump cannot be used to take
over listings. An admin session can also manage any ad.

---

## Cost

Everything below fits in the free tier comfortably:

- **Pages** — unlimited requests; 500 builds/month
- **D1** — 5 GB storage, 5 million row reads/day
- **R2** — 10 GB storage, and no egress fees ever

You will need to add a payment method to the account to *enable* R2, but you are
not charged while you stay inside the free allowance.

---

## Prerequisites

- A Cloudflare account (the free plan is fine)
- Node.js 18 or newer
- This project on your machine, with dependencies installed:

```bash
npm install
```

Every command below uses `npx wrangler`, which resolves to the copy of Wrangler
this project already depends on. Check it works with:

```bash
npx wrangler --version
```

---

## Quick start

Nine commands, in order. Substitute your own email and password in step 7.

```bash
# 1. Sign in (opens a browser window)
npx wrangler login

# 2. Create the database — copy the database_id it prints
npx wrangler d1 create petbikroy

# 3. Paste that id into wrangler.toml, replacing the row of zeros, then:

# 4. Create the photo bucket (enable R2 in the dashboard first — see below)
npx wrangler r2 bucket create petbikroy-images

# 5. Create the 12 tables
npx wrangler d1 execute petbikroy --remote --file=db/schema.sql

# 6. Optional: load the demo catalogue so the site launches with content
npx wrangler d1 execute petbikroy --remote --file=db/seed.sql

# 7. Create your admin account
node tools/create-admin.mjs --remote \
  --email you@example.com --password 'a-long-password-here' --name 'Your Name'

# 8. Create the Pages project
npx wrangler pages project create petbikroy --production-branch main

# 9. Deploy
npx wrangler pages deploy
```

Step 9 prints your live URL, something like
`https://petbikroy.pages.dev`. Open it, then open `/admin/` and sign in.

> **R2 must be enabled once per account.** Go to the Cloudflare dashboard →
> **R2** and accept the terms (it asks for a payment method). Without this,
> step 4 fails and photo uploads will not work — though the rest of the site
> will still run, since every listing falls back to generated artwork.

---

## Step by step

### Step 1 — Sign in

```bash
npx wrangler login
```

Opens a browser, asks you to authorise Wrangler, and stores a token locally.
Verify with `npx wrangler whoami`.

### Step 2 — Create the D1 database

```bash
npx wrangler d1 create petbikroy
```

It prints something like:

```
✅ Successfully created DB 'petbikroy'
database_id = "8f2c1e04-9a77-4b2e-9c31-6d5a0e7f1b83"
```

Open `wrangler.toml` and replace this line:

```toml
database_id = "00000000-0000-0000-0000-000000000000"
```

with your real id. If you skip this, deploying fails with
`could not find database` — the zeros are deliberately not a valid id.

### Step 3 — Create the R2 bucket

Enable R2 in the dashboard first (see the note above), then:

```bash
npx wrangler r2 bucket create petbikroy-images
```

The bucket name must match `bucket_name` in `wrangler.toml`. The *binding* name
is `IMAGES` — that is the name your code sees as `env.IMAGES`.

### Step 4 — Create the tables

```bash
npx wrangler d1 execute petbikroy --remote --file=db/schema.sql
```

This creates 12 tables with `CREATE TABLE IF NOT EXISTS`, so running it twice is
harmless. Confirm it worked:

```bash
npx wrangler d1 execute petbikroy --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

You should see: `admins`, `ads`, `ad_photos`, `areas`, `audit_log`,
`categories`, `locations`, `rate_limits`, `reports`, `sessions`, `settings`,
`subcategories`.

### Step 5 — Load the demo catalogue (optional)

```bash
npx wrangler d1 execute petbikroy --remote --file=db/seed.sql
```

Gives you 10 categories, 73 breeds, 8 divisions, 41 areas, 34 sample ads and the
default settings. Without it the site works but shows empty states everywhere.

**Safe to re-run.** Every statement is `INSERT OR REPLACE` keyed on ids like
`seed-1`, so it refreshes the demo rows and leaves ads posted by real users
untouched. To remove the demo catalogue later:

```bash
npx wrangler d1 execute petbikroy --remote \
  --command="DELETE FROM ads WHERE id LIKE 'seed-%'"
```

`db/seed.sql` is generated from `public/assets/js/data.js` by
`npm run seed:build`. Edit the JavaScript, regenerate, re-apply.

### Step 6 — Create your admin account

```bash
node tools/create-admin.mjs --remote \
  --email you@example.com \
  --password 'choose-something-long' \
  --name 'Your Name'
```

| Flag | Meaning |
|---|---|
| `--email` | Required. Must be unique. |
| `--password` | Omit and it generates a strong one and prints it. |
| `--name` | Shown in the panel and written to the audit log. |
| `--role` | `admin` (default) or `moderator`. |
| `--remote` | Target the deployed database. Without it, the local one. |
| `--db` | Database name, if you did not call it `petbikroy`. |

The tool imports the *same* hashing code the API uses, so there is no chance of
the two drifting apart. Re-running it with an existing email resets that
account's password.

Moderators can approve, reject and edit ads but cannot change settings or manage
staff accounts — those stay admin-only.

### Step 7 — Deploy

```bash
npx wrangler pages project create petbikroy --production-branch main
npx wrangler pages deploy
```

The project name comes from `name` in `wrangler.toml`, and the site to upload
comes from `pages_build_output_dir` — both already set. There is no build step;
the files are shipped as they are.

Afterwards, re-deploy at any time with just:

```bash
npm run deploy
```

### Step 8 — Verify

```bash
curl -s https://petbikroy.pages.dev/api/stats
curl -s https://petbikroy.pages.dev/api/facets | head -c 300
```

`/api/stats` should return a JSON object with a `total`. If you get HTML back
instead, the Functions did not deploy — check that the deploy output mentioned
your Functions count.

Then open `https://petbikroy.pages.dev/admin/`, sign in, and check the Overview
tab shows real numbers.

Before you announce the site, walk through this once:

1. Post an ad from `/post.html` with a couple of photos.
2. Confirm it appears on `/listings.html` and that the photos render.
3. Open it and press **Show phone number** — the number you typed should appear.
4. Open `/my-ads.html`, edit the ad, mark it sold, then put it back.
5. In `/admin/`, find the ad under **Listings**, try **Reject** with a reason,
   then check `/my-ads.html` shows you that reason.

---

## Prefer to deploy from Git?

Push this project to GitHub/GitLab, then in the Cloudflare dashboard go to
**Workers & Pages → Create → Pages → Connect to Git** and pick the repository.
Use these build settings:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | *(leave empty)* |
| Build output directory | `public` |

Two things to know:

- The project must use the **V2 build system** (the default for new projects).
  V1 ignores `wrangler.toml`, so your D1 and R2 bindings would silently be
  missing. It is under Settings → Build → Build system version.
- Create the D1 database and R2 bucket first, and commit the real
  `database_id` into `wrangler.toml`. Cloudflare reads that file at build time.

Every push to `main` then redeploys automatically, and pull requests get their
own preview URLs.

---

## Prefer to configure with the dashboard?

Some people would rather click than edit config. That path works too, but the
two approaches are mutually exclusive: **if `wrangler.toml` contains
`pages_build_output_dir`, it becomes the source of truth and the matching fields
turn read-only in the dashboard.**

To go dashboard-first, remove the `pages_build_output_dir` line from
`wrangler.toml` (keep the rest — local development still reads it), then:

1. **Workers & Pages → Create → Pages**, upload the `public` folder or connect Git.
2. **Settings → Build → Build output directory**: `public`
3. **Settings → Bindings → Add → D1 database**
   - Variable name: `DB`
   - D1 database: `petbikroy`
4. **Settings → Bindings → Add → R2 bucket**
   - Variable name: `IMAGES`
   - R2 bucket: `petbikroy-images`
5. Redeploy for the bindings to take effect.

The binding names `DB` and `IMAGES` must match exactly — they are what the code
reads as `env.DB` and `env.IMAGES`.

---

## Custom domain

1. Add your domain to Cloudflare (Nameservers → point your registrar at the two
   Cloudflare gives you). Wait for it to go **Active**.
2. **Workers & Pages → petbikroy → Custom domains → Set up a domain**.
3. Pick `petbikroy.com` or `www.petbikroy.com`; Cloudflare creates the DNS
   record and issues a certificate for you.

Leave `ALLOWED_ORIGINS` empty. It exists only for the unusual case where the
front end is hosted somewhere *other* than this Pages project and needs to call
this API from a different origin. Same-origin requests are always allowed.

---

## Running it locally

```bash
npm install
npm run db:schema        # create the tables in the local database
npm run db:seed          # load the demo catalogue
npm run admin:new -- --email admin@local.test --password 'correct-horse-battery'
npm run dev              # http://localhost:8788
```

`npm run dev` starts `wrangler pages dev`, which runs your real Functions against
a real D1 database and a real R2 bucket — emulated on disk under
`.wrangler/state/`. Nothing is mocked. Local data is completely separate from
production: it lives in that folder, and the `--local` flag (the default for the
`db:*` scripts) keeps it that way.

| I want to… | Do this |
|---|---|
| Apply a schema change locally | `npm run db:schema` |
| Push a schema change to production | `npm run db:schema:remote` |
| Load demo data locally | `npm run db:seed` |
| Load demo data in production | `npm run db:seed:remote` |
| Create a local admin | `npm run admin:new -- --email a@b.test` |
| Create a production admin | `npm run admin:new -- --remote --email a@b.test` |
| Start over locally | `rm -rf .wrangler/state` then re-run the first three |
| Check the Functions compile | `npm run check` |

### Tests

| Command | What it runs |
|---|---|
| `npm test` | Front-end suite, 726 assertions, under QuickJS — no browser, no Node APIs |
| `npm run test:api` | 218 assertions against a **live** server: real D1, real PBKDF2, real cookies, real R2 |
| `npm run test:admin` | 49 assertions driving the admin panel in jsdom against that same live server |

The API and admin suites need the dev server running first (`npm run dev` in
another terminal). `test:api` resets rate limits and test ads before it starts
and restores the posting limit when it finishes.

Neither suite is a mock. `test:api` boots Wrangler, talks to it over HTTP, and
sends real multipart uploads — which is how a genuine bug was caught where
`?sold=1` returned nothing, because the status filter was overriding it.

The front-end suite needs QuickJS on your `PATH`, or pass it explicitly:

```bash
QJS=/path/to/qjs npm test
```

QuickJS is used deliberately: it has no `Intl` and no `URLSearchParams`, which
forces the front end to avoid `toLocaleString('en-IN')` and friends. Code that
passes there does not break in a browser with a reduced locale set.

---

## Using the admin panel

Sign in at `/admin/`. It is a single page with six views:

| View | What you do there |
|---|---|
| **Overview** | Listings by status, daily posting volume, recent reports and audit trail |
| **Listings** | Every ad regardless of status. Approve, reject with a reason, feature, edit, delete |
| **Moderation** | The review queue — ads whose status is `pending` or `rejected` |
| **Reports** | Ads users have flagged, with the reason and note |
| **Settings** | Site name, contact email, listings per page, posting on/off, auto-approve, posting limit |
| **Team** | Staff accounts and roles |

Settings worth knowing:

- **auto_approve** (default on) — when on, new ads go live immediately. Turn it
  off and every ad lands in **Moderation** first. This is the switch to flip if
  you start getting spam.
- **posting_enabled** — set to `0` to freeze new ads without taking the site down.
- **post_limit** (default 10) — ads allowed per IP per hour. Surfaced to clients
  in the `x-ratelimit-limit`, `x-ratelimit-remaining` and `x-ratelimit-reset`
  response headers, so a well-behaved client can back off before it is refused.

The panel is behind a login, but it is not invisible: `/admin/` is reachable and
returns the page before you sign in. That is normal for an admin panel. If you
want it hidden entirely, put it behind
[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/) —
a free Zero Trust rule restricting `/admin` to your email address. It costs
nothing for up to 50 users and takes about two minutes.

---

## Security notes

**What is already handled.**

- Passwords: PBKDF2-SHA256, 25,000 iterations, unique salt per account.
  The iteration count is tuned to fit Cloudflare's ~10 ms CPU budget on the
  free plan while still being expensive to brute-force.
- Sessions: random 256-bit tokens, stored only as hashes, `HttpOnly` + `Secure`
  + `SameSite=Strict` cookies.
- Owner tokens for ad editing: stored only as hashes, never returned again after
  creation.
- All SQL uses prepared statements with bound parameters.
- Uploads are checked by magic bytes, not by the `Content-Type` the client
  claims, capped at 5 MB across 6 photos per ad, and served back with a fixed
  content type so a malicious file cannot be executed in a browser.
- The path used to store an uploaded photo is generated server-side; a crafted
  filename cannot escape the bucket prefix.
- Every field is re-validated on the server. The wizard's client-side checks are
  for instant feedback only and are never trusted.
- A Content-Security-Policy of `script-src 'self'` is set in `public/_headers`.
  There is no inline script anywhere in the project.
- The admin panel is marked `noindex` and the API sends `X-Robots-Tag: noindex`
  so search engines do not crawl moderation screens.

**What is up to you.**

1. **Change the admin password** from whatever you used during setup.
2. **Add a second admin** under **Team** and keep one as a spare, so a lost
   password does not lock you out. (If it does happen, re-run
   `tools/create-admin.mjs` with `--remote`.)
3. **Turn off auto_approve** once the site has real traffic and you want a human
   to see listings before they go live.
4. **Consider Cloudflare Access** on `/admin`, as described above.

---

## Troubleshooting

**`could not find database` when deploying**
The `database_id` in `wrangler.toml` is still the placeholder zeros. Paste the
real one from `npx wrangler d1 create petbikroy` (step 2).

**`/api/...` returns HTML instead of JSON**
Functions did not deploy. Re-run `npx wrangler pages deploy` and check the output
mentions Functions. `npm run check` compiles them locally and will tell you if
there is a syntax error.

**500 errors from every API route**
The bindings are missing or misnamed. They must be called `DB` and `IMAGES`
exactly — the code reads `env.DB` and `env.IMAGES`. Check
Settings → Bindings, and remember a redeploy is required after changing them.

**Photo uploads fail but everything else works**
R2 is not enabled on the account. Dashboard → **R2** → accept the terms. The site
degrades gracefully in the meantime: listings without photos render generated
category artwork instead.

**Admin login appears to succeed but bounces back to the form**
The session cookie is `Secure`, so it is only sent over HTTPS. Use the real
`https://` URL, or `http://localhost:8788` locally — browsers treat localhost as
a secure context, which is why local sign-in works.

**`429 Too Many Requests` while testing**
You hit the posting limit (default 10 per IP per hour). Raise it in
Settings, or reset it directly:

```bash
npx wrangler d1 execute petbikroy --remote \
  --command="DELETE FROM rate_limits"
```

**A deploy fails complaining about environment overrides**
`vars`, `d1_databases` and `r2_buckets` are *non-inheritable*. If you add an
`[env.preview]` or `[env.production]` block that overrides any one of them, you
must override all three. The shipped `wrangler.toml` avoids this entirely by not
defining environment overrides.

**Dashboard says bindings are read-only**
Expected. Once a deployment carries a `wrangler.toml` with
`pages_build_output_dir`, that file is the source of truth and the dashboard
shows those fields for information only. Edit `wrangler.toml` and redeploy — or
remove that one line to hand control back to the dashboard.

**Seed data will not delete**
Demo rows are the ones whose id starts with `seed-`:
`DELETE FROM ads WHERE id LIKE 'seed-%'`. Photo and report rows are removed
automatically by `ON DELETE CASCADE`. Saved ads live in the browser, not the
database, so nothing else needs clearing.

---

## Project layout

```
wrangler.toml                 Pages configuration (bindings, output dir)
package.json                  scripts + the two dev dependencies

public/                       ← everything served to visitors
  index.html  listings.html  ad.html  post.html  my-ads.html
  favorites.html  404.html
  admin/index.html            the admin panel
  assets/css/styles.css       design tokens, layout, components
  assets/js/data.js           taxonomy + seed catalogue + localStorage layer
  assets/js/app.js            shared chrome: header, footer, icons, ad cards
  assets/js/api.js            the data layer every page talks to
  assets/js/wizard.js         post-an-ad rules as pure, testable functions
  assets/js/{home,listings,ad,post,my-ads,favorites,not-found}.js
  _headers                    CSP and security headers
  _routes.json                which paths invoke Functions

functions/                    ← compiled into a Worker, never downloadable
  _lib/{http,auth,validate,db,mappers,ads}.js
  api/{ads,taxonomy,stats,facets,upload,reports,img}/
  api/admin/{session,overview,ads,settings,admins,reports}
  api/[[path]].js             JSON 404, so a bad /api path never returns HTML

db/schema.sql                 12 tables, CHECK constraints, indexes
db/seed.sql                   GENERATED — run `npm run seed:build` to rebuild
tools/generate-seed.mjs       data.js  ->  seed.sql
tools/create-admin.mjs        create or re-password an admin account
tests/                        three suites, described above
```

### How the front end talks to the API

`public/assets/js/api.js` is the only module that performs network calls. Every
page driver goes through it, and it degrades instead of failing:

- **Backend reachable** → real data, server-side pagination, live filter counts,
  photo uploads to R2.
- **No backend** (opened from `file://`, or deployed statically) → falls back to
  the bundled catalogue in `data.js`, so the site still browses, searches and
  lets you post. Ads you post that way live only in that browser.

That is why the site can be opened by double-clicking `index.html` *and* served
properly from Cloudflare with the same code.
