/* ==========================================================================
   GET /api/users/:id — a seller's public profile and their live listings

   Deliberately carries no phone number or email. A buyer gets the number
   from an individual ad, not from a page that would let anyone harvest a
   list of every seller on the site in one request.
   ========================================================================== */

import { json, handleError, notFound, corsHeaders } from '../../_lib/http.js';
import { getSettings } from '../../_lib/db.js';
import { parseFilters, queryAds } from '../../_lib/ads.js';
import { toPublicAd, toPublicUser } from '../../_lib/mappers.js';
import { getUserRow, countUserAds } from '../../_lib/users.js';

export async function onRequestGet({ request, env, params }) {
  try {
    const row = await getUserRow(env, params.id);
    // A disabled account is treated as if it never existed, so deactivating a
    // spammer also takes their profile page offline.
    if (!row || !row.is_active) throw notFound('That seller does not exist.');

    const settings = await getSettings(env);
    const url = new URL(request.url);

    // Reuse the ordinary listing filters, scoped to this member. That gives
    // seller pages their own paging, sorting and "sold" toggle for free.
    const filters = parseFilters(url, { publicOnly: true });
    filters.userId = row.id;

    const [counts, result] = await Promise.all([
      countUserAds(env, row.id),
      queryAds(env, filters, {
        defaultPerPage: Number(settings.listings_per_page) || 12,
      }),
    ]);

    return json({
      user: toPublicUser(row, { adCount: counts.active }),
      ads: result.rows.map(r => toPublicAd(r, result.photos.get(r.id) ?? [])),
      total: result.total,
      page: result.page,
      pages: result.pages,
      perPage: result.perPage,
    }, {
      // Same reasoning as /api/ads: caller-independent, so briefly cacheable.
      cache: 'public, max-age=30, stale-while-revalidate=120',
    });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
