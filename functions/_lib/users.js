/* ==========================================================================
   PetBikroy — member queries
   Shared by the public seller profile, "my ads" and the admin panel.
   ========================================================================== */

import {
  AD_COLUMNS, AD_FROM, USER_COLUMNS, photoUrl, toAdminUser, toOwnUser,
} from './mappers.js';
import { intParam, str } from './http.js';

/** Listing counts for one member: how many in total, how many live. */
export async function countUserAds(env, userId) {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active
       FROM ads WHERE user_id = ?`,
  ).bind(userId).first();
  return { total: row?.total ?? 0, active: row?.active ?? 0 };
}

/** A single member row (every column), or null. */
export function getUserRow(env, id) {
  return env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
}

/**
 * The full row plus counts, shaped for the member's own eyes.
 *
 * Sign-in, registration and the session probe all answer with this, so a
 * profile edited on one page looks the same on the next one.
 */
export async function ownProfile(env, id) {
  const row = await getUserRow(env, id);
  if (!row) return null;
  const counts = await countUserAds(env, id);
  return toOwnUser(row, { adCount: counts.active });
}

/** Headline member numbers for the admin dashboard. */
export async function userCounts(env) {
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [row, sellers] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
              SUM(CASE WHEN verified  = 1 THEN 1 ELSE 0 END) AS verified,
              SUM(CASE WHEN created_at > ? THEN 1 ELSE 0 END) AS joined7
         FROM users`,
    ).bind(weekAgo).first(),
    env.DB.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM ads').first(),
  ]);

  return {
    total: row?.total ?? 0,
    active: row?.active ?? 0,
    verified: row?.verified ?? 0,
    joined7: row?.joined7 ?? 0,
    withAds: sellers?.n ?? 0,
  };
}

/**
 * Paginated, searchable member list for the admin panel.
 * @returns {{users: object[], total: number, page: number, pages: number, perPage: number}}
 */
export async function listUsers(env, url, { defaultPerPage = 25 } = {}) {
  const p = url.searchParams;
  const q = str(p.get('q'), 80);
  const filter = str(p.get('filter'), 20) || 'all';
  const page = intParam(p.get('page'), { min: 1, fallback: 1 });
  const perPage = intParam(p.get('perPage'), { min: 1, max: 100, fallback: defaultPerPage });

  const clauses = [];
  const binds = [];

  if (q) {
    const like = `%${q.toLowerCase()}%`;
    clauses.push('(LOWER(u.name) LIKE ? OR u.phone LIKE ? OR LOWER(u.email) LIKE ?)');
    binds.push(like, like, like);
  }
  if (filter === 'active')   clauses.push('u.is_active = 1');
  if (filter === 'disabled') clauses.push('u.is_active = 0');
  if (filter === 'verified') clauses.push('u.verified = 1');

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  const totals = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM users u ${where}`,
  ).bind(...binds).first();
  const total = totals?.total ?? 0;

  const rows = await env.DB.prepare(
    `SELECT ${USER_COLUMNS},
            (SELECT COUNT(*) FROM ads WHERE ads.user_id = u.id) AS ad_count,
            (SELECT COUNT(*) FROM ads
              WHERE ads.user_id = u.id AND ads.status = 'active') AS ad_active_count
       FROM users u
       ${where}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?`,
  ).bind(...binds, perPage, (page - 1) * perPage).all();

  return {
    users: (rows.results ?? []).map(r => toAdminUser(r, {
      adCount: r.ad_count ?? 0,
      activeAds: r.ad_active_count ?? 0,
    })),
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** The member's own listings, newest first, with their photos. */
export async function userAds(env, userId) {
  const [rows, photos] = await Promise.all([
    env.DB.prepare(
      `SELECT ${AD_COLUMNS} ${AD_FROM}
        WHERE a.user_id = ?
        ORDER BY a.created_at DESC`,
    ).bind(userId).all(),
    env.DB.prepare(
      `SELECT ad_id, r2_key FROM ad_photos
        WHERE ad_id IN (SELECT id FROM ads WHERE user_id = ?)
        ORDER BY sort_order, id`,
    ).bind(userId).all(),
  ]);

  const byAd = new Map();
  for (const p of photos.results ?? []) {
    if (!byAd.has(p.ad_id)) byAd.set(p.ad_id, []);
    byAd.get(p.ad_id).push(photoUrl(p.r2_key));
  }

  return { rows: rows.results ?? [], photoMap: byAd };
}
