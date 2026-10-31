/* ==========================================================================
   GET /api/admin/ads   — every ad, whatever its status
   ========================================================================== */

import { json, handleError, corsHeaders, str } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/auth.js';
import { parseFilters, queryAds } from '../../_lib/ads.js';
import { toAdminAd } from '../../_lib/mappers.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(env, request);

    const url = new URL(request.url);
    const filters = parseFilters(url, { publicOnly: false });
    filters.status = str(url.searchParams.get('status'), 20) || 'all';

    const result = await queryAds(env, filters, { defaultPerPage: 25 });

    return json({
      ads: result.rows.map(r => toAdminAd(r, result.photos.get(r.id) ?? [])),
      total: result.total,
      page: result.page,
      pages: result.pages,
      perPage: result.perPage,
    });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
