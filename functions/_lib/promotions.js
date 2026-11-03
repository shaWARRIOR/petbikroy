/* ==========================================================================
   Promotion queries shared by the seller and admin endpoints.

   A promotion is a paid order to feature an ad. The seller creates the order
   and submits payment details (status 'pending'); an admin approves it, which
   flips the ad's `featured` flag and sets an expiry. These helpers keep the
   SQL in one place so the two endpoints agree on the shape of a row.
   ========================================================================== */

import { badRequest, intParam } from './http.js';
import { promotionStillActive } from './db.js';

/** Payment methods a seller can pick, shown in the promote modal. */
export const PAYMENT_METHODS = ['bkash', 'nagad', 'upay', 'bank', 'cash'];

/**
 * Loads a promotion row plus the ad it promotes, so callers can check
 * ownership and ad status in one query set.
 */
export async function loadPromotionWithAd(env, id) {
  const row = await env.DB.prepare('SELECT * FROM promotions WHERE id = ?')
    .bind(id).first();
  if (!row) return null;
  const ad = await env.DB.prepare('SELECT * FROM ads WHERE id = ?')
    .bind(row.ad_id).first();
  return { row, ad };
}

/**
 * The ad's own currently-active promotion, if any — used to hide the promote
 * button while a promotion is live and to explain why it is unavailable.
 * Returns null when there is no active promotion.
 */
export async function activePromotionForAd(env, adId) {
  const rows = await env.DB.prepare(
    'SELECT * FROM promotions WHERE ad_id = ? AND status = \'approved\' '
      + 'ORDER BY created_at DESC LIMIT 1',
  ).bind(adId).all();
  const row = rows.results?.[0];
  if (!row) return null;
  return promotionStillActive(row) ? row : null;
}

/**
 * Builds a promotions query with optional status filter and search, plus the
 * ad it promotes. Returns rows, total and the per-page cursor.
 */
export async function queryPromotions(env, { status, q, page, perPage }) {
  const sql = ['SELECT * FROM promotions'];
  const where = ['1=1'];
  const binds = [];

  if (status && status !== 'all') {
    where.push('p.status = ?');
    binds.push(status);
  }
  if (q) {
    where.push('(p.payment_ref LIKE ? OR a.title LIKE ?)');
    const like = `%${q}%`;
    binds.push(like, like);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;
  sql.push(`SELECT COUNT(*) AS n FROM promotions p JOIN ads a ON a.id = p.ad_id ${whereSql}`);
  const total = (await env.DB.prepare(sql[1]).bind(...binds).first())?.n ?? 0;

  sql.push(
    `SELECT p.*, a.title AS ad_title, a.status AS ad_status, a.user_id AS ad_user_id,
           u.name AS owner_name
       FROM promotions p JOIN ads a ON a.id = p.ad_id
       LEFT JOIN users u ON u.id = p.user_id
       ${whereSql}
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
  );
  binds.push(perPage, (page - 1) * perPage);
  const rows = (await env.DB.prepare(sql[2]).bind(...binds).all()).results ?? [];

  const pages = Math.ceil(total / perPage) || 1;
  return { rows, total, page, perPage, pages };
}

/** Validates a duration a seller can buy, clamped to sane bounds. */
export function durationParam(value) {
  const n = intParam(value, { min: 7, max: 90, fallback: 7 });
  return n;
}

/**
 * Maps a promotion row (joined with its ad) to the admin list shape, adding
 * the ad owner's name and whether the promotion is still running.
 */
export function toAdminPromotion(row) {
  const active = promotionStillActive(row);
  return {
    id: row.id,
    adId: row.ad_id,
    adTitle: row.ad_title || '',
    adStatus: row.ad_status || '',
    adOwner: row.ad_user_id || '',
    ownerName: row.owner_name || '',
    userId: row.user_id,
    amount: row.amount,
    durationDays: row.duration_days,
    status: row.status,
    active: !!active,
    paymentMethod: row.payment_method || '',
    paymentRef: row.payment_ref || '',
    createdAt: row.created_at,
    paidAt: row.paid_at || '',
    approvedAt: row.approved_at || '',
    expiresAt: row.expires_at || '',
  };
}

/** A human-readable label for a payment method, or the raw value if unknown. */
export const paymentMethodLabel = m => ({
  bkash: 'bKash', nagad: 'Nagad', upay: 'Upay', bank: 'Bank transfer', cash: 'Cash',
})[m] || m;
