# PetBikroy 🐾

A pet classifieds marketplace in the style of [bikroy.com](https://bikroy.com) —
browse, filter, favourite and post ads for pets, pet food, accessories and
services across Bangladesh.

Real listings, real photo uploads, a real database, and an admin panel to run it.
Everything runs on Cloudflare's free tier.

**No build step. No framework. No runtime dependencies.**

---

## Quick start

**Run it locally** (needs Node 18+):

```bash
npm install
npm run db:schema && npm run db:seed
npm run admin:new -- --email admin@local.test --password 'correct-horse-battery'
npm run dev            # http://localhost:8788
```

**Put it online** — see **[SETUP.md](SETUP.md)** for a nine-command walkthrough.
The short version:

```bash
npx wrangler login
npx wrangler d1 create petbikroy      # paste the id into wrangler.toml
npx wrangler r2 bucket create petbikroy-images
npx wrangler d1 execute petbikroy --remote --file=db/schema.sql
npx wrangler d1 execute petbikroy --remote --file=db/seed.sql
node tools/create-admin.mjs --remote --email you@example.com
npx wrangler pages project create petbikroy --production-branch main
npx wrangler pages deploy
```

### Demo accounts

The seed catalogue is posted by **24 fictional members**. Every one of them signs
in with the shared password:

```
password    petbikroy123
numbers     01311000000  Rakib Hasan        (and 23 more — see db/seed.sql)
```

Sign in at `/login.html` with any of those numbers to see the site as a seller:
your own listings, the edit form, the "mark sold" control, and a public seller
page. The full list of numbers and names is at the top of `db/seed.sql`.

The admin panel at `/admin/` is a *separate* account, created by
`tools/create-admin.mjs`. It is not part of the seed.

> **Change the demo password before you put a seeded database online.** These
> accounts are published in this repository, so anyone who reads it can sign in
> as them. Either delete the seeded members
> (`DELETE FROM users WHERE id LIKE 'u-seed-%'`) or reset their passwords from
> **Members** in the admin panel.

---

## Pages

| Page | File | What it does |
|---|---|---|
| Home | `public/index.html` | Hero search, category tiles with live counts, promoted ads, fresh listings, browse-by-division |
| Browse | `public/listings.html` | Sidebar filters (category, breed, division, area, price, sold), sorting, grid/list toggle, pagination |
| Ad detail | `public/ad.html?id=…` | Photo gallery with keyboard nav, specs, description, seller card, phone reveal, report an ad, similar ads |
| Post an ad | `public/post.html` | 5-step wizard: category → details + photos → location → review → published |
| My ads | `public/my-ads.html` | Everything you posted: status, rejection reasons, edit, mark sold, delete |
| Saved | `public/favorites.html` | Ads you hearted |
| Sign in | `public/login.html` | Phone number + password |
| Register | `public/register.html` | Create an account — name, phone number, password |
| Account | `public/account.html` | Edit your profile, change your password, see your listing counts |
| Seller profile | `public/seller.html?id=…` | A member's public page: name, area, bio, verified badge, their live ads |
| Admin | `public/admin/index.html` | Overview, listings, moderation queue, members, reports, settings, team |

---

## Features

**For buyers and sellers**

- **Shareable filters.** Every filter lives in the URL, so results can be
  bookmarked, shared, and navigated with the back button.
- **Full-text search** across title, description, breed, category and location.
- **Real photo uploads** to object storage, with magic-byte validation.
- **Accounts with a phone number.** Sign in with a mobile number and a password
  — no email required. Anyone can browse without signing in; posting and
  managing a listing needs an account, so a seller sees their own ads in one
  place instead of losing them when a browser is cleared.
- **Public seller profiles** — name, area, bio, verified badge, join date and
  live listings. Contact details stay on the individual ad where the seller
  chose to publish them.
- **Report an ad** with a reason, which lands in the admin moderation queue.
- **Promoted ads** float to the top of default results, as on real classifieds sites.
- **View counting** de-duplicated per visitor per day, so refreshing does not inflate it.
- **Generated artwork.** Listings without photos get deterministic SVG artwork
  derived from the ad's own id, so a grid of them still reads as a grid of
  listings rather than the same placeholder repeated.
- **Safe rendering.** All user-supplied text is HTML-escaped before it reaches the DOM.
- Bengali-marketplace details: prices in ৳ with digit grouping, BD divisions and
  areas, Bangladeshi mobile validation (`01[3-9]XXXXXXXX`), animal-welfare and
  anti-fraud guidance.

**For the operator**

- **Admin panel** with role-gated views: dashboard, listing management,
  moderation queue, member management, report triage, site settings and staff
  accounts.
- **Moderation controls** — approve, reject with a reason the seller sees,
  feature, edit or delete any listing.
- **Member controls** — verify a seller, suspend or reactivate an account,
  reassign a listing to a different member, issue a new password, or delete an
  account along with everything it owns.
- **Spam controls** — configurable posting limit per member per hour and
  sign-up limit per address per hour, a global posting on/off switch, and an
  auto-approve toggle that routes new ads through review.
- **Audit log** recording who did what, from sign-ins and registrations to
  moderation and member actions.
- **Rate-limit headers** (`x-ratelimit-*`) so well-behaved clients can back off.

---

## Architecture

```
public/     static front end + admin panel   ← the only thing visitors download
functions/  the API, compiled into a Worker  ← never downloadable
db/         schema + generated seed data
tools/      seed generator, admin bootstrap
tests/      three suites, described below
```

`wrangler.toml` sets `pages_build_output_dir = "public"`, so Pages serves
exactly that one directory. The database schema, tests, tooling and config all
sit outside it and are unreachable over HTTP.

### The three layers

1. **`functions/_lib/`** — the API's internals: HTTP helpers, auth (PBKDF2 +
   sessions), validation, D1 access, row-to-JSON mapping, and the filter/sort
   query builder. Shared by every route, no route logic in here.
2. **`functions/api/`** — one file per route. Each is thin: parse, validate,
   call a lib, map the result.
3. **`public/assets/js/`** — the browser. `data.js` knows the taxonomy and holds
   the offline catalogue; `app.js` owns shared chrome (header, footer, icons,
   cards, toasts); `api.js` is the only module that makes network calls; one
   driver per page wires it together.

### The data layer degrades instead of failing

`public/assets/js/api.js` is the single network entry point, and it has an
offline path:

- **Backend reachable** — real data, server-side pagination, live filter counts,
  photo uploads to R2.
- **No backend** — falls back to the bundled catalogue in `data.js`, so the site
  still browses, searches and lets you post. Ads posted that way live only in
  that browser.

That is why the same code works when served from Cloudflare *and* when you
double-click `index.html`.

### Server-side validation is the authority

`functions/_lib/validate.js` decides what is acceptable. `public/assets/js/wizard.js`
mirrors those limits so the posting form can give instant feedback — it is a
convenience, never a gate. `tests/validate.py` fails the build if the two ever
disagree, because a *stricter* client silently rejects input the API would have
accepted. That check exists because it happened: the wizard once refused photos
over 2.5 MB that the server would happily have stored.

### Storage

| Data | Where | Why |
|---|---|---|
| Ads, members, categories, admin accounts, sessions, reports, settings | D1 (SQLite) | Relational, queryable, indexed |
| Photos | R2 | Large objects, no egress fees |
| Favourites, preferred division, recent searches | `localStorage` | Personal to one browser; not worth a table |

Nothing security-sensitive lives in `localStorage`: sessions are `HttpOnly`
cookies the page cannot read, and a listing belongs to a member row rather than
to a token held in a browser.

---

## API

Public:

```
GET    /api/ads              list, filter, sort, paginate
POST   /api/ads              create (signed-in members only)
GET    /api/ads/:id          detail, including the seller's phone number
PUT    /api/ads/:id          edit   (the owning member, or an admin)
DELETE /api/ads/:id          remove (the owning member, or an admin)
POST   /api/ads/:id/view     count a view
GET    /api/taxonomy         categories, breeds, divisions, areas
GET    /api/facets           live counts for the sidebar filters
GET    /api/stats            homepage counters
POST   /api/upload           photo upload to R2 (signed-in members only)
GET    /img/*                serve a photo
POST   /api/reports          report an ad
GET    /api/users/:id        a member's public profile and live listings
```

Accounts:

```
POST   /api/auth/register    create an account and sign in
POST   /api/auth/login       sign in with phone number + password
GET    /api/auth/session     who am I
PATCH  /api/auth/session     edit my profile
DELETE /api/auth/session     sign out
PUT    /api/auth/password    change my password
GET    /api/me/ads           my listings, including pending and rejected
```

Admin (`/api/admin/…`): `session`, `overview`, `ads`, `ads/:id`, `users`,
`users/:id`, `reports`, `settings`, `admins`, `admins/:id`.

Unknown `/api/*` paths return JSON, never the HTML 404 page — a
`functions/api/[[path]].js` catch-all handles that, so a client parsing
`response.json()` never chokes on markup.

---

## Security

- Passwords hashed with **PBKDF2-SHA256**, 25,000 iterations, unique salt per
  account. The iteration count is tuned to fit Cloudflare's ~10 ms CPU budget on
  the free plan while staying expensive to brute-force.
- Sessions are random 256-bit tokens stored only as hashes, delivered in
  `HttpOnly; Secure; SameSite=Strict` cookies. **There is no session secret to
  configure or leak.** Members and staff use separate cookies and separate
  tables, so an admin session can never be mistaken for a member account.
- A listing belongs to the member who posted it, and ownership is checked on
  every write. Ownership is compared against the database row, not against a
  token the browser holds, so clearing a cookie cannot hand a listing to
  somebody else.
- Repeat sign-in failures are counted per account and per address, and the
  counter is cleared by a successful sign-in.
- All SQL uses prepared statements with bound parameters.
- Uploads are validated by **magic bytes**, not the client's claimed
  `Content-Type`, and served back with a fixed content type so a malicious file
  cannot execute in a browser. Storage keys are generated server-side, so a
  crafted filename cannot escape the bucket prefix.
- `Content-Security-Policy: script-src 'self'` with no inline script anywhere.
- Ad **detail** responses are `no-store` because they vary by caller — the
  listing endpoint is publicly cacheable only because it omits private fields.

Before you announce the site, see the security checklist in
[SETUP.md](SETUP.md) — in particular, change the admin password you used during
setup and consider putting `/admin` behind Cloudflare Access.

---

## Tests

Three suites, none of them mocked.

| Command | Assertions | What it covers |
|---|---|---|
| `npm test` | 726 | Front-end logic under QuickJS |
| `npm run test:api` | 360 | The API against a live server |
| `npm run test:admin` | 71 | The admin panel in jsdom, against that same server |

The API and admin suites need `npm run dev` running in another terminal first.

**`npm test`** runs under [QuickJS](https://bellard.org/quickjs/) rather than
Node, deliberately: it has no `Intl` and no `URLSearchParams`, which forces the
front end to avoid `toLocaleString('en-IN')` and friends. Code that passes there
does not break in a browser with a reduced locale set. Install it once:

```bash
curl -O https://bellard.org/quickjs/quickjs-2024-01-13.tar.xz
tar xf quickjs-2024-01-13.tar.xz && cd quickjs-2024-01-13 && make qjs
QJS=/path/to/qjs npm test
```

| File | Covers |
|---|---|
| `tests/parse-check.js` | every module in `public/assets/js/` parses (discovered, not hand-listed) |
| `tests/test-data.js` | search, sort, counts, persistence, favourites, hidden ads |
| `tests/test-ui.js` | card rendering, XSS escaping, filter/URL state machine, seed-data integrity |
| `tests/test-wizard.js` | validation rules, phone/email edge cases, publish round-trip |
| `tests/dump-svgs.js` | writes the generated artwork out for `validate.py` to inspect |
| `tests/validate.py` | generated SVG is well-formed, HTML nests correctly, **client and server limits agree** |
| `tests/links.py` | no broken links, correct script order per page, admin panel wiring |

> **A QuickJS trap worth knowing:** when an uncaught exception escapes a
> *module*, `qjs` still exits `0`. A suite that signals failure by throwing from
> module scope is therefore reported as passing no matter what. Every test here
> either calls `std.exit(1)` directly or wraps its `eval` in a `try/catch` that
> does — `test-wizard.js` was silently green for exactly this reason.

`test:api` boots Wrangler, talks to it over HTTP and sends real multipart
uploads, so it exercises real D1, real PBKDF2, real cookies and real R2. It
registers throwaway member accounts, resets rate limits and test data before
starting, and restores the posting and sign-up limits when it finishes.

That suite earns its keep: it caught a bug where `?sold=1` returned nothing
because the status filter was overriding it, and the limit-agreement check was
added after the client and server drifted apart on photo size. Fixing the
QuickJS exit-code trap above also revealed that `api.js` had never been
parse-checked at all.

---

## Notes

Not affiliated with bikroy.com. "Chat with seller" is a stub. Prices, listings
and seller names in the demo catalogue are fictional.

`db/seed.sql` is **generated** — edit `public/assets/js/data.js` and run
`npm run seed:build` instead of editing the SQL by hand.
