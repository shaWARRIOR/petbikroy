#!/usr/bin/env node
/* ==========================================================================
   Generates db/seed.sql from the canonical demo catalogue in
   public/assets/js/data.js, so there is exactly one source of truth for the
   categories, divisions and sample ads.

     node tools/generate-seed.mjs

   Then apply it:
     wrangler d1 execute petbikroy --local  --file=db/seed.sql
     wrangler d1 execute petbikroy --remote --file=db/seed.sql
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'public/assets/js/data.js');
const OUT = join(ROOT, 'db/seed.sql');

/* ---------------------------------------------------- load the catalogue -- */

// data.js is a plain classic script that ends up exposing `PB`.
// Evaluating it here keeps the generator in lockstep with the front end.
const src = readFileSync(SOURCE, 'utf8');
const PB = new Function(`${src}\nreturn PB;`)();

const { CATEGORIES, LOCATIONS, SEED_ADS } = PB;

/* ------------------------------------------------------------- SQL helpers */

const q = v => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const n = v => Number(v) || 0;
const b = v => (v ? 1 : 0);

/** Normalises any timestamp to UTC ISO-8601 so string comparison sorts correctly. */
const ts = v => new Date(v).toISOString();

/** An unguessable owner hash: nobody holds these tokens, so demo ads are admin-managed. */
const orphanOwnerHash = () =>
  createHash('sha256').update(randomBytes(32)).digest('hex');

/* -------------------------------------------------------------- build SQL */

const lines = [];
const out = s => lines.push(s);

out('-- ============================================================================');
out('-- PetBikroy — demo catalogue');
out('--');
out('-- GENERATED FILE — do not edit by hand.');
out('-- Regenerate with:  node tools/generate-seed.mjs');
out('--');
out(`-- Source: public/assets/js/data.js`);
out('-- ============================================================================');
out('');
out('PRAGMA foreign_keys = ON;');
out('');

/* taxonomy */
out('-- ---------------------------------------------------------------- taxonomy --');
out('');
for (const [i, c] of CATEGORIES.entries()) {
  out(`INSERT OR REPLACE INTO categories (id, name, emoji, sort_order) VALUES (${q(c.id)}, ${q(c.name)}, ${q(c.emoji)}, ${i});`);
  c.subs.forEach((sub, j) => {
    out(`INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES (${q(c.id)}, ${q(sub)}, ${j});`);
  });
}
out('');
for (const [i, l] of LOCATIONS.entries()) {
  out(`INSERT OR REPLACE INTO locations (id, name, sort_order) VALUES (${q(l.id)}, ${q(l.name)}, ${i});`);
  l.areas.forEach((area, j) => {
    out(`INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES (${q(l.id)}, ${q(area)}, ${j});`);
  });
}
out('');

/* ads */
out('-- ------------------------------------------------------------------ demo ads --');
out('');
for (const ad of SEED_ADS) {
  const created = ts(ad.created);
  const status = ad.status === 'sold' ? 'sold' : 'active';
  const kind = ad.price > 0 ? 'sale' : 'adoption';
  const published = created;

  out(`INSERT OR REPLACE INTO ads (
  id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, owner_token_hash, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  ${q(ad.id)}, ${q(ad.cat)}, ${q(ad.sub)}, ${q(ad.title)}, ${q(ad.desc)},
  ${n(ad.price)}, ${b(ad.negotiable)}, ${q(kind)},
  ${q(ad.loc)}, ${q(ad.area)}, ${q(ad.age || '')}, ${q(ad.gender || '')},
  ${b(ad.vaccinated)}, ${q(ad.condition || 'New')}, ${q(status)}, ${b(ad.featured)}, ${n(ad.views)},
  ${q(ad.seller.name)}, ${q('017' + String(10000000 + Math.floor(Math.random() * 8999999)))}, ${q('')},
  ${q(orphanOwnerHash())}, '',
  ${q(created)}, ${q(created)}, ${q(published)}
);`);
  out('');
}

/* default settings */
out('-- ---------------------------------------------------------------- settings --');
out('');
const settings = {
  site_name: 'PetBikroy',
  auto_approve: '1',
  listings_per_page: '12',
  posting_enabled: '1',
  post_limit: '10',
  contact_email: 'hello@petbikroy.test',
};
for (const [k, v] of Object.entries(settings)) {
  out(`INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (${q(k)}, ${q(v)}, ${q(new Date().toISOString())});`);
}
out('');
out('-- Done.');
out('');

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join('\n'), 'utf8');

console.log(`Wrote ${OUT}`);
console.log(`  ${CATEGORIES.length} categories, ${CATEGORIES.reduce((a, c) => a + c.subs.length, 0)} breeds`);
console.log(`  ${LOCATIONS.length} divisions, ${LOCATIONS.reduce((a, l) => a + l.areas.length, 0)} areas`);
console.log(`  ${SEED_ADS.length} demo ads`);
