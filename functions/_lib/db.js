/* ==========================================================================
   PetBikroy — D1 access helpers: taxonomy cache, settings, rate limiting
   ========================================================================== */

import { tooMany, nowIso } from './http.js';

/* -------------------------------------------------------------- taxonomy */

/*
 * Categories, breeds, divisions and areas change about once a year but are
 * needed on nearly every request. Caching them in module scope means an
 * isolate answers validation from memory instead of four D1 round trips.
 */
let taxonomyCache = null;
let taxonomyExpires = 0;
const TAXONOMY_TTL_MS = 60_000;

export async function loadTaxonomy(env) {
  const now = Date.now();
  if (taxonomyCache && now < taxonomyExpires) return taxonomyCache;

  const [cats, subs, locs, areas] = await Promise.all([
    env.DB.prepare('SELECT id, name, emoji FROM categories ORDER BY sort_order, name').all(),
    env.DB.prepare('SELECT category_id, name FROM subcategories ORDER BY sort_order, name').all(),
    env.DB.prepare('SELECT id, name FROM locations ORDER BY sort_order, name').all(),
    env.DB.prepare('SELECT location_id, name FROM areas ORDER BY sort_order, name').all(),
  ]);

  const subsByCat = new Map();
  for (const s of subs.results ?? []) {
    if (!subsByCat.has(s.category_id)) subsByCat.set(s.category_id, new Set());
    subsByCat.get(s.category_id).add(s.name);
  }
  const areasByLoc = new Map();
  for (const a of areas.results ?? []) {
    if (!areasByLoc.has(a.location_id)) areasByLoc.set(a.location_id, new Set());
    areasByLoc.get(a.location_id).add(a.name);
  }

  taxonomyCache = {
    categories: new Set((cats.results ?? []).map(c => c.id)),
    subsByCat,
    locations: new Set((locs.results ?? []).map(l => l.id)),
    areasByLoc,
    categoryList: cats.results ?? [],
    locationList: locs.results ?? [],
  };
  taxonomyExpires = now + TAXONOMY_TTL_MS;
  return taxonomyCache;
}

/** Drops the cache (called after taxonomy is edited). */
export function invalidateTaxonomy() {
  taxonomyCache = null;
  taxonomyExpires = 0;
}

/** Full nested taxonomy for the front end. */
export async function taxonomyPayload(env) {
  const [cats, subs, locs, areas] = await Promise.all([
    env.DB.prepare('SELECT id, name, emoji FROM categories ORDER BY sort_order, name').all(),
    env.DB.prepare('SELECT category_id, name FROM subcategories ORDER BY sort_order, name').all(),
    env.DB.prepare('SELECT id, name FROM locations ORDER BY sort_order, name').all(),
    env.DB.prepare('SELECT location_id, name FROM areas ORDER BY sort_order, name').all(),
  ]);

  const subsByCat = new Map();
  for (const s of subs.results ?? []) {
    if (!subsByCat.has(s.category_id)) subsByCat.set(s.category_id, []);
    subsByCat.get(s.category_id).push(s.name);
  }
  const areasByLoc = new Map();
  for (const a of areas.results ?? []) {
    if (!areasByLoc.has(a.location_id)) areasByLoc.set(a.location_id, []);
    areasByLoc.get(a.location_id).push(a.name);
  }

  return {
    categories: (cats.results ?? []).map(c => ({
      id: c.id, name: c.name, emoji: c.emoji,
      subs: subsByCat.get(c.id) ?? [],
    })),
    locations: (locs.results ?? []).map(l => ({
      id: l.id, name: l.name,
      areas: areasByLoc.get(l.id) ?? [],
    })),
  };
}

/* -------------------------------------------------------------- settings */

export const DEFAULT_SETTINGS = {
  site_name: 'PetBikroy',
  auto_approve: '1',          // new ads go live immediately
  auto_moderation: '1',       // screen every new ad automatically
  auto_reject: '0',           // hold auto-detected spam instead of rejecting
  listings_per_page: '12',
  posting_enabled: '1',
  post_limit: '10',           // ads one visitor may publish per hour
  signup_limit: '10',         // accounts one address may create per hour
  contact_email: 'hello@petbikroy.test',
};

export function invalidateSettings() { settingsCache = null; settingsExpires = 0; }
let settingsCache = null;
let settingsExpires = 0;
const SETTINGS_TTL_MS = 30_000;

export async function getSettings(env) {
  const now = Date.now();
  if (settingsCache && now < settingsExpires) return settingsCache;

  const out = { ...DEFAULT_SETTINGS };
  try {
    const rows = await env.DB.prepare('SELECT key, value FROM settings').all();
    for (const r of rows.results ?? []) out[r.key] = r.value;
  } catch {
    // A fresh database with no settings table yet still works.
  }
  settingsCache = out;
  settingsExpires = now + SETTINGS_TTL_MS;
  return out;
}

export async function setSetting(env, key, value) {
  await env.DB.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).bind(String(key), String(value), nowIso()).run();
  invalidateSettings();
}

export const isOn = v => v === '1' || v === 'true' || v === true;

/* ---------------------------------------------------------- rate limiting */

/*
 * A fixed-window counter per bucket (e.g. "ad:1.2.3.4"). Cheap, and good
 * enough to stop casual spam without needing KV or Durable Objects.
 */
let lastSweep = 0;

export async function rateLimit(env, bucket, limit, windowSeconds) {
  const now = Date.now();
  const nowStr = new Date(now).toISOString();

  // Sweep stale rows at most once every five minutes per isolate.
  if (now - lastSweep > 300_000) {
    lastSweep = now;
    try {
      await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(nowStr).run();
    } catch { /* non-fatal */ }
  }

  const row = await env.DB.prepare(
    'SELECT count, expires_at FROM rate_limits WHERE bucket = ?',
  ).bind(bucket).first();

  const alive = row && row.expires_at > nowStr;
  const count = alive ? row.count + 1 : 1;
  const expiresAt = alive ? row.expires_at : new Date(now + windowSeconds * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO rate_limits (bucket, count, expires_at) VALUES (?, ?, ?)
     ON CONFLICT(bucket) DO UPDATE SET count = excluded.count, expires_at = excluded.expires_at`,
  ).bind(bucket, count, expiresAt).run();

  if (count > limit) throw tooMany();
  return { count, limit, remaining: Math.max(0, limit - count), expiresAt };
}

/**
 * Same counter, but reports whether the limit was passed instead of throwing.
 * Used where exceeding the limit is normal and not an error — e.g. deciding
 * whether a page view is the first from this visitor today.
 * @returns {{allowed: boolean, count: number}}
 */
export async function softRateLimit(env, bucket, limit, windowSeconds) {
  const now = Date.now();
  const nowStr = new Date(now).toISOString();

  const row = await env.DB.prepare(
    'SELECT count, expires_at FROM rate_limits WHERE bucket = ?',
  ).bind(bucket).first();

  const alive = row && row.expires_at > nowStr;
  const count = alive ? row.count + 1 : 1;
  const expiresAt = alive ? row.expires_at : new Date(now + windowSeconds * 1000).toISOString();

  await env.DB.prepare(
    `INSERT INTO rate_limits (bucket, count, expires_at) VALUES (?, ?, ?)
     ON CONFLICT(bucket) DO UPDATE SET count = excluded.count, expires_at = excluded.expires_at`,
  ).bind(bucket, count, expiresAt).run();

  return { allowed: count <= limit, count };
}

/* ------------------------------------------------------------ taxonomy write */

/** Replaces the stored taxonomy. Used by the seed importer. */
export async function replaceTaxonomy(env, { categories, locations }) {
  const stmts = [];
  for (const [i, c] of categories.entries()) {
    stmts.push(env.DB.prepare(
      'INSERT OR REPLACE INTO categories (id, name, emoji, sort_order) VALUES (?, ?, ?, ?)',
    ).bind(c.id, c.name, c.emoji || '🐾', i));
    for (const [j, sub] of (c.subs || []).entries()) {
      stmts.push(env.DB.prepare(
        'INSERT OR IGNORE INTO subcategories (category_id, name, sort_order) VALUES (?, ?, ?)',
      ).bind(c.id, sub, j));
    }
  }
  for (const [i, l] of locations.entries()) {
    stmts.push(env.DB.prepare(
      'INSERT OR REPLACE INTO locations (id, name, sort_order) VALUES (?, ?, ?)',
    ).bind(l.id, l.name, i));
    for (const [j, area] of (l.areas || []).entries()) {
      stmts.push(env.DB.prepare(
        'INSERT OR IGNORE INTO areas (location_id, name, sort_order) VALUES (?, ?, ?)',
      ).bind(l.id, area, j));
    }
  }
  if (stmts.length) await env.DB.batch(stmts);
  invalidateTaxonomy();
}
