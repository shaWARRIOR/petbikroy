/* ==========================================================================
   PATCH /api/promotions/:id   — seller cancels their own pending order

   Only a `pending` order can be cancelled; once an admin has approved it the
   ad is promoted and the seller can unpromote it through the usual path
   (or the ad simply expires). Only the paying member may cancel.
   ========================================================================== */

import {
  json, handleError, corsHeaders, nowIso, HttpError,
} from '../../../_lib/http.js';
import { requireUser, recordAudit } from '../../../_lib/auth.js';
import { loadPromotionWithAd } from '../../../_lib/promotions.js';

export async function onRequestPatch({ request, env, params }) {
  try {
    const user = await requireUser(env, request);
    const { row, ad } = await loadPromotionWithAd(env, params.id);
    if (!row) return json({ error: 'That promotion no longer exists.' }, { status: 404 });
    if (row.user_id !== user.id) {
      throw new HttpError('You can only cancel your own promotion.', 403);
    }
    if (row.status !== 'pending') {
      throw new HttpError('This promotion can no longer be cancelled.', 409);
    }

    await env.DB.prepare(
      'UPDATE promotions SET status = \'cancelled\', updated_at = ? WHERE id = ?',
    ).bind(nowIso(), params.id).run();

    await recordAudit(env, {
      actorId: user.id, actorEmail: user.phone,
      action: 'ad.promotion.cancelled', targetType: 'promotion', targetId: params.id,
      detail: `${ad?.title || 'promotion'} · ৳${row.amount}`,
    });

    return json({ ok: true, status: 'cancelled' });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
