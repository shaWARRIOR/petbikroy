/* ==========================================================================
   GET /api/stats   — public counters for the home page strip
   ========================================================================== */

import { json, handleError } from '../_lib/http.js';
import { adCounts } from '../_lib/ads.js';
import { taxonomyPayload, getSettings, promotionCost } from '../_lib/db.js';

export async function onRequestGet({ request, env }) {
  try {
    const [counts, taxonomy, settings] = await Promise.all([
      adCounts(env),
      taxonomyPayload(env),
      getSettings(env),
    ]);

    // Only count divisions that actually have something listed.
    const rows = await env.DB.prepare(
      "SELECT COUNT(DISTINCT location_id) AS n FROM ads WHERE status = 'active'",
    ).first();

    // Promotion pricing, so the promote modal can show the cost up front.
    const { amount } = await promotionCost(env, settings.promote_days);

    return json({
      ads: counts.active,
      sold: counts.sold,
      categories: taxonomy.categories.length,
      locations: rows?.n || taxonomy.locations.length,
      views: counts.views,
      promotePrice: amount,
      promoteDays: Number(settings.promote_days) || 7,
    }, { cache: 'public, max-age=60, stale-while-revalidate=300' });
  } catch (e) {
    return handleError(e, request, env);
  }
}
