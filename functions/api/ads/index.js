/* ==========================================================================
   GET  /api/ads   — browse ads (filters, sorting, pagination)
   POST /api/ads   — publish an ad (members only)
   ========================================================================== */

import {
  json, readJson, newId, nowIso, HttpError, handleError, corsHeaders,
} from '../../_lib/http.js';
import { loadTaxonomy, getSettings, isOn, rateLimit } from '../../_lib/db.js';
import { validateAd, assertValid } from '../../_lib/validate.js';
import { parseFilters, queryAds, setPhotos } from '../../_lib/ads.js';
import { toPublicAd } from '../../_lib/mappers.js';
import { requireUser, recordAudit } from '../../_lib/auth.js';
import { scoreAd, isApproved } from '../../_lib/moderation.js';

const POST_WINDOW_SECONDS = 3600;
const AUTO_MODERATION_RECENT_ADS = 5;   // how many recent ads to check for dupes
const AUTO_MODERATION_WINDOW_DAYS = 2;  // and over what span



export async function onRequestGet({ request, env }) {
  try {
    const settings = await getSettings(env);
    const filters = parseFilters(new URL(request.url), { publicOnly: true });

    const result = await queryAds(env, filters, {
      defaultPerPage: Number(settings.listings_per_page) || 12,
    });

    return json({
      ads: result.rows.map(row => toPublicAd(row, result.photos.get(row.id) ?? [])),
      total: result.total,
      page: result.page,
      pages: result.pages,
      perPage: result.perPage,
    }, { cache: 'public, max-age=30, stale-while-revalidate=120' });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    // Posting is tied to an account, so the rate limit is per member rather
    // than per IP — a whole cyber cafe can no longer exhaust one visitor's
    // quota, and opening a new browser no longer resets it.
    const user = await requireUser(env, request);

    const settings = await getSettings(env);
    if (!isOn(settings.posting_enabled)) {
      throw new HttpError('Posting is temporarily disabled by the administrator.', 503);
    }

    const limit = Number(settings.post_limit) || 10;
    const quota = await rateLimit(env, `ad:${user.id}`, limit, POST_WINDOW_SECONDS);

    const body = await readJson(request, 48 * 1024);

    // The account already knows who is posting and which number a buyer
    // should ring, so a client may leave the contact block out entirely.
    if (!String(body.contactName ?? '').trim()) body.contactName = user.name;
    if (!String(body.contactPhone ?? '').trim()) body.contactPhone = user.phone;
    if (body.contactEmail === undefined) body.contactEmail = user.email || '';

    const taxonomy = await loadTaxonomy(env);
    const ad = assertValid(validateAd(body, taxonomy));

    // The automated reviewer runs before the human queue. When auto-moderation
    // is on, an ad that clears it can still go live instantly under auto-approve;
    // one that is held or rejected is parked in the review queue (or rejected
    // outright when auto-reject is on), never skipping straight to live.
    let status = 'pending';
    let rejectionReason = '';
    let autoDecision = '';
    let autoReason = '';
    const moderation = isOn(settings.auto_moderation)
      ? scoreAd(ad, { isDuplicate: await recentDuplicate(env, user.id, ad.title) })
      : null;

    if (moderation && !isApproved(moderation)) {
      autoDecision = moderation.decision;   // 'held' | 'rejected'
      autoReason = moderation.reasons.join(' ');
      if (autoDecision === 'rejected' && isOn(settings.auto_reject)) {
        status = 'rejected';
        rejectionReason = autoReason || 'Auto-rejected listing';
      } else {
        status = 'pending';
      }
    } else if (moderation && isApproved(moderation)) {
      autoDecision = 'approved';
      // An approved ad still honours the auto-approve switch.
      status = isOn(settings.auto_approve) ? 'active' : 'pending';
    } else {
      // Auto-moderation disabled: behave exactly as before.
      status = isOn(settings.auto_approve) ? 'active' : 'pending';
    }

    const id = newId('ad-');
    const now = nowIso();
    const live = status === 'active';

    await env.DB.prepare(
      `INSERT INTO ads (
         id, user_id, category_id, subcategory, title, description, price, negotiable,
         kind, location_id, area, age, gender, vaccinated, condition,
         status, featured, views, contact_name, contact_phone, contact_email,
         rejection_reason, auto_decision, auto_reason,
         created_at, updated_at, published_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).bind(
      id, user.id, ad.categoryId, ad.subcategory, ad.title, ad.description, ad.price,
      ad.negotiable ? 1 : 0, ad.kind, ad.locationId, ad.area, ad.age, ad.gender,
      ad.vaccinated ? 1 : 0, ad.condition, status, 0, 0,
      ad.contactName, ad.contactPhone, ad.contactEmail,
      rejectionReason, autoDecision, autoReason,
      now, now, live ? now : null,
    ).run();

    if (ad.photos.length) await setPhotos(env, id, ad.photos);

    await recordAudit(env, {
      actorId: user.id, actorEmail: user.phone,
      action: 'ad.created', targetType: 'ad', targetId: id, detail: ad.title,
    });

    const row = await env.DB.prepare('SELECT * FROM ads WHERE id = ?').bind(id).first();

    return json({
      ad: toPublicAd(row, ad.photos.map(k => `/img/${k}`)),
      status: row.status,
      autoDecision: row.auto_decision,
      autoReason: row.auto_reason,
    }, {
      status: 201,
      headers: {
        'x-ratelimit-limit': String(quota.limit),
        'x-ratelimit-remaining': String(quota.remaining),
        'x-ratelimit-reset': quota.expiresAt,
      },
    });
  } catch (e) {
    return handleError(e, request, env);
  }
}

/**
 * True when this account posted an ad with the same title within the recent
 * window — enough to be a genuine duplicate, short enough to catch spam runs.
 */
async function recentDuplicate(env, userId, title) {
  if (!title) return false;
  const since = new Date(Date.now() - AUTO_MODERATION_WINDOW_DAYS * 86400_000)
    .toISOString();
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM ads
       WHERE user_id = ? AND status <> 'sold'
         AND title = ? AND created_at > ?`,
  ).bind(userId, title, since).first();
  return (row?.n ?? 0) > 0;
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
