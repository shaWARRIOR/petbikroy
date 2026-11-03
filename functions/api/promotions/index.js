/* ==========================================================================
   /api/promotions
     GET  — the signed-in member's own promotion history
     POST — pay to promote one of their active ads

   POST validates that the ad is live and owned by the caller, then records a
   promotion order in `pending` state: the seller has paid, and an admin must
   confirm before the ad actually becomes featured. This is the seller-facing
   counterpart to the admin moderation feature/unfeature actions.
   ========================================================================== */

import {
  json, handleError, corsHeaders, nowIso, newId,
  HttpError, badRequest, notFound,
} from '../../_lib/http.js';
import { requireUser, recordAudit } from '../../_lib/auth.js';
import { getSettings, promotionCost } from '../../_lib/db.js';
import {
  PAYMENT_METHODS, durationParam, activePromotionForAd,
} from '../../_lib/promotions.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireUser(env, request);
    const rows = await env.DB.prepare(
      'SELECT * FROM promotions WHERE user_id = ? ORDER BY created_at DESC',
    ).bind(user.id).all();

    return json({
      promotions: (rows.results ?? []).map(r => ({
        id: r.id, adId: r.ad_id, amount: r.amount, durationDays: r.duration_days,
        status: r.status, paymentMethod: r.payment_method || '',
        paymentRef: r.payment_ref || '', createdAt: r.created_at,
        approvedAt: r.approved_at || '', expiresAt: r.expires_at || '',
      })),
    });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireUser(env, request);
    const body = await request.json();

    const adId = (body.adId || '').toString().trim();
    if (!adId) throw badRequest('Choose an ad to promote.');

    const ad = await env.DB.prepare('SELECT * FROM ads WHERE id = ?').bind(adId).first();
    if (!ad) throw notFound('That ad does not exist.');
    if (ad.status !== 'active') {
      throw new HttpError('Only active ads can be promoted.', 409);
    }
    if (ad.user_id !== user.id) {
      throw new HttpError('You can only promote your own ad.', 403);
    }
    if (await activePromotionForAd(env, adId)) {
      throw new HttpError('This ad already has an active promotion.', 409);
    }

    const durationDays = durationParam(body.durationDays);
    const paymentMethod = (body.paymentMethod || '').toString().trim();
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      throw badRequest('Choose a payment method.');
    }
    const paymentRef = (body.paymentRef || '').toString().trim();
    if (!paymentRef) throw badRequest('Enter the payment reference number.');

    const { amount } = await promotionCost(env, durationDays);

    const id = newId('promo_');
    const now = nowIso();
    await env.DB.prepare(
      `INSERT INTO promotions
         (id, ad_id, user_id, amount, duration_days, status,
          payment_method, payment_ref, created_at, paid_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
    ).bind(id, adId, user.id, amount, durationDays, paymentMethod, paymentRef, now, now, now).run();

    await recordAudit(env, {
      actorId: user.id, actorEmail: user.phone,
      action: 'ad.promotion.created', targetType: 'promotion', targetId: id,
      detail: `${ad.title} · ৳${amount} · ${durationDays} days`,
    });

    return json({
      promotion: {
        id, adId, amount, durationDays, status: 'pending',
        paymentMethod, paymentRef, createdAt: now,
      },
      // The running total the seller pays, so the modal can confirm the figure.
      amount,
    }, { status: 201 });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
