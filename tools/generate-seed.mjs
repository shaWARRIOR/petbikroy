#!/usr/bin/env node
/* ==========================================================================
   Generates db/seed.sql from the canonical demo catalogue in
   public/assets/js/data.js, so there is exactly one source of truth for the
   categories, divisions, demo members and sample ads.

     node tools/generate-seed.mjs

   Then apply it:
     wrangler d1 execute petbikroy --local  --file=db/seed.sql
     wrangler d1 execute petbikroy --remote --file=db/seed.sql

   Every demo listing is owned by a real member account, one per distinct
   seller name in the catalogue, so the seeded site behaves exactly like a
   site members signed up for.
   ========================================================================== */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashPassword } from '../functions/_lib/auth.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'public/assets/js/data.js');
const OUT = join(ROOT, 'db/seed.sql');

/**
 * Every demo member shares this password, so the catalogue can be browsed
 * as a seller without generating and filing 24 secrets. It is documented in
 * README.md and must never be used on a real deployment.
 */
const DEMO_PASSWORD = 'petbikroy123';

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

/* ------------------------------------------------------------ demo members */

const slug = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/**
 * A valid Bangladeshi mobile number — 01[3-9] plus eight digits — derived
 * from the seller's position, so regenerating the seed never reshuffles
 * which number belongs to which seller.
 */
const phoneFor = i =>
  `01${[3, 5, 6, 7, 8, 9][i % 6]}${String(11_000_000 + i * 137).padStart(8, '0')}`;

// One account per distinct seller name, in first-appearance order so the ids
// are stable across regenerations.
const members = [];
const byName = new Map();

for (const ad of SEED_ADS) {
  const name = ad.seller.name;
  if (byName.has(name)) continue;

  const joined = ts(ad.seller.joined);
  const record = {
    id: `u-seed-${slug(name)}`,
    name,
    phone: phoneFor(members.length),
    email: `${slug(name)}@petbikroy.test`,
    // data.js already records which demo sellers are verified businesses.
    verified: ad.seller.verified === true,
    joined,
    // Taken from their first listing — a sensible default for the profile.
    loc: ad.loc,
    area: ad.area,
    bio: `${name} — ${ad.area} based, listing on PetBikroy since ${new Date(joined).getFullYear()}.`,
  };

  byName.set(name, record);
  members.push(record);
}

// Hash the shared password once per account: distinct salts, so the rows look
// exactly like accounts that happened to choose the same password.
const credentials = new Map();
for (const m of members) {
  credentials.set(m.id, await hashPassword(DEMO_PASSWORD));
}

/* -------------------------------------------------------------- build SQL */

const lines = [];
const out = s => lines.push(s);

out('-- ============================================================================');
out('-- PetBikroy — demo catalogue');
out('--');
out('-- GENERATED FILE — do not edit by hand.');
out('-- Regenerate with:  node tools/generate-seed.mjs');
out('--');
out('-- Source: public/assets/js/data.js');
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

/* members */
out('-- --------------------------------------------------------------- members --');
out('--');
out('-- Every demo member signs in with their phone number and the shared');
out(`-- password "${DEMO_PASSWORD}". These are throwaway accounts for a`);
out('-- demo dataset — see README.md before putting this on a public site.');
out('--');
for (const m of members) {
  const { hash, salt, iterations } = credentials.get(m.id);
  out(`-- ${m.name} — ${m.phone}`);
  out(`INSERT OR REPLACE INTO users (
  id, phone, name, email, password_hash, password_salt, iterations,
  bio, location_id, area, verified, is_active, created_at, updated_at
) VALUES (
  ${q(m.id)}, ${q(m.phone)}, ${q(m.name)}, ${q(m.email)},
  ${q(hash)}, ${q(salt)}, ${n(iterations)},
  ${q(m.bio)}, ${q(m.loc)}, ${q(m.area)}, ${b(m.verified)}, 1,
  ${q(m.joined)}, ${q(m.joined)}
);`);
  out('');
}

/* ads */
out('-- ------------------------------------------------------------------ demo ads --');
out('');
for (const ad of SEED_ADS) {
  const owner = byName.get(ad.seller.name);
  const created = ts(ad.created);
  const status = ad.status === 'sold' ? 'sold' : 'active';
  const kind = ad.price > 0 ? 'sale' : 'adoption';
  const published = created;

  out(`INSERT OR REPLACE INTO ads (
  id, user_id, category_id, subcategory, title, description, price, negotiable, kind,
  location_id, area, age, gender, vaccinated, condition, status, featured, views,
  contact_name, contact_phone, contact_email, rejection_reason,
  created_at, updated_at, published_at
) VALUES (
  ${q(ad.id)}, ${q(owner.id)}, ${q(ad.cat)}, ${q(ad.sub)}, ${q(ad.title)}, ${q(ad.desc)},
  ${n(ad.price)}, ${b(ad.negotiable)}, ${q(kind)},
  ${q(ad.loc)}, ${q(ad.area)}, ${q(ad.age || '')}, ${q(ad.gender || '')},
  ${b(ad.vaccinated)}, ${q(ad.condition || 'New')}, ${q(status)}, ${b(ad.featured)}, ${n(ad.views)},
  ${q(ad.seller.name)}, ${q(owner.phone)}, ${q(owner.email)}, '',
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
  signup_limit: '10',
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

const adCounts = members.map(m => SEED_ADS.filter(a => a.seller.name === m.name).length);

console.log(`Wrote ${OUT}`);
console.log(`  ${CATEGORIES.length} categories, ${CATEGORIES.reduce((a, c) => a + c.subs.length, 0)} breeds`);
console.log(`  ${LOCATIONS.length} divisions, ${LOCATIONS.reduce((a, l) => a + l.areas.length, 0)} areas`);
console.log(`  ${members.length} members, ${SEED_ADS.length} demo ads`);
console.log(`  busiest member owns ${Math.max(...adCounts)} ads, quietest ${Math.min(...adCounts)}`);
console.log('');
console.log(`  Sign in as any member above with password: ${DEMO_PASSWORD}`);
