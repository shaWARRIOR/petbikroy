/* ==========================================================================
   PetBikroy — ad query builder (shared by the public and admin lists)
   ========================================================================== */

import { AD_COLUMNS, photoUrl } from './mappers.js';
import { csv, intParam, str, bool } from './http.js';

export const SORTS = {
  recent: 'a.featured DESC, a.published_at DESC, a.created_at DESC',
  'price-asc': 'a.price ASC, a.created_at DESC',
  'price-desc': 'a.price DESC, a.created_at DESC',
  popular: 'a.views DESC, a.created_at DESC',
  oldest: 'a.created_at ASC',
};

/**
 * Builds the shared WHERE clause + bindings.
 * @returns {{where: string, binds: any[]}}
 */
function buildWhere(f, { publicOnly }) {
  const clauses = [];
  const binds = [];

  if (publicOnly) {
    clauses.push("a.status = 'active'");
  } else if (f.status && f.status !== 'all') {
    const list = Array.isArray(f.status) ? f.status : [f.status];
    clauses.push(`a.status IN (${list.map(() => '?').join(',')})`);
    binds.push(...list);
  }

  if (f.cat) { clauses.push('a.category_id = ?'); binds.push(f.cat); }

  if (f.subs && f.subs.length) {
    clauses.push(`a.subcategory IN (${f.subs.map(() => '?').join(',')})`);
    binds.push(...f.subs);
  }

  if (f.loc) { clauses.push('a.location_id = ?'); binds.push(f.loc); }

  if (f.areas && f.areas.length) {
    clauses.push(`a.area IN (${f.areas.map(() => '?').join(',')})`);
    binds.push(...f.areas);
  }

  if (Number.isFinite(f.min)) { clauses.push('a.price >= ?'); binds.push(f.min); }
  if (Number.isFinite(f.max)) { clauses.push('a.price <= ?'); binds.push(f.max); }
  if (f.featuredOnly) clauses.push('a.featured = 1');

  // Every search term must appear somewhere in the ad.
  if (f.q) {
    for (const term of String(f.q).toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8)) {
      clauses.push(`(
        LOWER(a.title) LIKE ?
        OR LOWER(a.description) LIKE ?
        OR LOWER(a.subcategory) LIKE ?
        OR LOWER(a.area) LIKE ?
      )`);
      const like = `%${term.replace(/[%_]/g, m => '\\' + m)}%`;
      binds.push(like, like, like, like);
    }
  }

  return {
    where: clauses.length ? 'WHERE ' + clauses.join(' AND ') : '',
    binds,
  };
}

/** Parses raw query-string filters into a normalised object. */
export function parseFilters(url, { publicOnly = true } = {}) {
  const p = url.searchParams;
  const min = intParam(p.get('min'), { min: 0, fallback: null });
  const max = intParam(p.get('max'), { min: 0, fallback: null });
  const includeSold = publicOnly && bool(p.get('sold'));

  return {
    publicOnly,
    q: str(p.get('q'), 120),
    cat: str(p.get('cat'), 40),
    subs: csv(p.get('sub')),
    loc: str(p.get('loc'), 40),
    areas: csv(p.get('area')),
    min: min === null ? undefined : min,
    max: max === null ? undefined : max,
    sort: SORTS[p.get('sort')] ? p.get('sort') : 'recent',
    // `?sold=1` widens the public listing to include sold ads rather than
    // replacing the status filter with it — these are the only two statuses
    // the public may ever see.
    status: includeSold ? ['active', 'sold']
          : publicOnly ? 'active'
          : str(p.get('status'), 20) || 'all',
    featuredOnly: bool(p.get('featured')),
    includeSold,
    page: intParam(p.get('page'), { min: 1, fallback: 1 }),
    perPage: intParam(p.get('perPage'), { min: 1, max: 48, fallback: null }),
  };
}

/**
 * Runs a filtered, sorted, paginated ad query.
 * @returns {{ads: object[], total: number, page: number, pages: number, perPage: number}}
 */
export async function queryAds(env, f, { defaultPerPage = 12, includePhotos = true } = {}) {
  // Public browsing hides sold ads unless explicitly asked for.
  const showSold = f.includeSold === true;
  const publicOnly = f.publicOnly && !showSold;

  const { where, binds } = buildWhere(f, { publicOnly });

  const perPage = f.perPage || defaultPerPage;
  const page = Math.max(1, f.page || 1);
  const offset = (page - 1) * perPage;
  const order = SORTS[f.sort] || SORTS.recent;

  const countRow = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM ads a ${where}`,
  ).bind(...binds).first();
  const total = countRow?.total ?? 0;

  const rows = await env.DB.prepare(
    `SELECT ${AD_COLUMNS} FROM ads a ${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
  ).bind(...binds, perPage, offset).all();

  const list = rows.results ?? [];
  const photos = includePhotos ? await fetchPhotoMap(env, list.map(a => a.id)) : new Map();

  return {
    rows: list,
    photos,
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** Fetches photo URLs for many ads at once, preserving order per ad. */
export async function fetchPhotoMap(env, adIds) {
  const map = new Map();
  if (!adIds.length) return map;

  const placeholders = adIds.map(() => '?').join(',');
  const res = await env.DB.prepare(
    `SELECT ad_id, r2_key FROM ad_photos
      WHERE ad_id IN (${placeholders})
      ORDER BY sort_order, id`,
  ).bind(...adIds).all();

  for (const p of res.results ?? []) {
    if (!map.has(p.ad_id)) map.set(p.ad_id, []);
    map.get(p.ad_id).push(photoUrl(p.r2_key));
  }
  return map;
}

/** Photos for a single ad, in order. */
export async function fetchPhotos(env, adId) {
  const res = await env.DB.prepare(
    'SELECT r2_key FROM ad_photos WHERE ad_id = ? ORDER BY sort_order, id',
  ).bind(adId).all();
  return (res.results ?? []).map(r => photoUrl(r.r2_key));
}

/** Replaces an ad's photos with the given R2 keys. */
export async function setPhotos(env, adId, keys) {
  const stmts = [env.DB.prepare('DELETE FROM ad_photos WHERE ad_id = ?').bind(adId)];
  keys.forEach((key, i) => {
    stmts.push(env.DB.prepare(
      'INSERT INTO ad_photos (id, ad_id, r2_key, sort_order) VALUES (?, ?, ?, ?)',
    ).bind(`${adId}-${i}`, adId, key, i));
  });
  await env.DB.batch(stmts);
}

/** Aggregate counts for the admin dashboard and the public stat strip. */
export async function adCounts(env) {
  const row = await env.DB.prepare(`
    SELECT
      COUNT(*)                                                   AS total,
      SUM(CASE WHEN status = 'active'   THEN 1 ELSE 0 END)       AS active,
      SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END)       AS pending,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)       AS rejected,
      SUM(CASE WHEN status = 'sold'     THEN 1 ELSE 0 END)       AS sold,
      SUM(CASE WHEN featured = 1        THEN 1 ELSE 0 END)       AS featured,
      COALESCE(SUM(views), 0)                                    AS views
    FROM ads
  `).first();
  return {
    total: row?.total ?? 0,
    active: row?.active ?? 0,
    pending: row?.pending ?? 0,
    rejected: row?.rejected ?? 0,
    sold: row?.sold ?? 0,
    featured: row?.featured ?? 0,
    views: row?.views ?? 0,
  };
}
