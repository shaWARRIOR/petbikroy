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

const POST_WINDOW_SECONDS = 3600;

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

    const id = newId('ad-');
    const now = nowIso();
    const live = isOn(settings.auto_approve);

    await env.DB.prepare(
      `INSERT INTO ads (
         id, user_id, category_id, subcategory, title, description, price, negotiable,
         kind, location_id, area, age, gender, vaccinated, condition,
         status, featured, views, contact_name, contact_phone, contact_email,
         rejection_reason, created_at, updated_at, published_at
       ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0,?,?,?,'',?,?,?)`,
    ).bind(
      id, user.id, ad.categoryId, ad.subcategory, ad.title, ad.description, ad.price,
      ad.negotiable ? 1 : 0, ad.kind, ad.locationId, ad.area, ad.age, ad.gender,
      ad.vaccinated ? 1 : 0, ad.condition, live ? 'active' : 'pending',
      ad.contactName, ad.contactPhone, ad.contactEmail,
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

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
