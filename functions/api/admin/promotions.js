/* ==========================================================================
   GET /api/admin/promotions   — every paid promotion, for staff to review

   The tracking view the seller's paid promotion feeds into: each row shows
   the ad, the payer, the amount, the payment method + reference they submitted,
   and the status so an admin can approve, cancel or refund it.
   ========================================================================== */

import { json, handleError, corsHeaders } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/auth.js';
import { queryPromotions, toAdminPromotion } from '../../_lib/promotions.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(env, request);

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const q = (url.searchParams.get('q') || '').trim();
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const perPage = Math.min(48, Math.max(1, Number(url.searchParams.get('perPage')) || 25));

    const { rows, total, pages } = await queryPromotions(env, {
      status, q, page, perPage,
    });

    return json({
      promotions: rows.map(toAdminPromotion),
      total,
      page,
      pages,
      perPage,
    });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
