/* ==========================================================================
   PATCH /api/admin/promotions/:id   — admin reviews one promotion

   Actions:
     approve  — confirm the payment, feature the ad, set an expiry, mark approved
     cancel   — void a still-pending order (never promoted)
     refund   — refund an approved promotion and un-feature the ad
   ========================================================================== */

import { json, handleError, corsHeaders, nowIso, HttpError } from '../../../_lib/http.js';
import { requireAdmin, recordAudit } from '../../../_lib/auth.js';
import { fetchPhotos } from '../../../_lib/ads.js';
import { toPublicAdDetail } from '../../../_lib/mappers.js';
import { loadPromotionWithAd } from '../../../_lib/promotions.js';

const ACTIONS = {
  approve:  { roles: ['admin'] },
  cancel:   { roles: ['admin'] },
  refund:   { roles: ['admin'] },
};

export async function onRequestPatch({ request, env, params }) {
  try {
    const admin = await requireAdmin(env, request);
    const { row, ad } = await loadPromotionWithAd(env, params.id);
    if (!row) return json({ error: 'That promotion no longer exists.' }, { status: 404 });

    const body = await request.clone().json().catch(() => ({}));
    const act = String(body.action || '').trim();
    const spec = ACTIONS[act];
    if (!spec) throw new HttpError('Unknown action.', 400);
    if (!spec.roles.includes(admin.role)) {
      throw new HttpError('Your role does not allow that action.', 403);
    }

    // Approving features the ad and sets when the promotion ends. A short
    // promotion (7 days) is the default; the seller's chosen duration wins.
    if (act === 'approve') {
      if (row.status !== 'pending') {
        throw new HttpError('This promotion is not awaiting approval.', 409);
      }
      const days = row.duration_days || 7;
      const expiresAt = new Date(Date.now() + days * 86400_000).toISOString();
      await env.DB.prepare(
        `UPDATE promotions SET status = 'approved', approved_at = ?, expires_at = ?,
                                 updated_at = ? WHERE id = ?`,
      ).bind(nowIso(), expiresAt, nowIso(), params.id).run();

      // Only feature an ad that is actually live; a sold/pending ad would never
      // show anyway, so flip the flag but leave its status untouched.
      if (ad.status === 'active') {
        await env.DB.prepare(
          'UPDATE ads SET featured = 1, updated_at = ? WHERE id = ?',
        ).bind(nowIso(), ad.id).run();
      }

      await recordAudit(env, {
        actorId: admin.id, actorEmail: admin.email,
        action: 'ad.promotion.approved', targetType: 'promotion', targetId: params.id,
        detail: `${ad.title} · ৳${row.amount}`,
      });
    } else if (act === 'cancel') {
      if (row.status !== 'pending') {
        throw new HttpError('Only pending promotions can be cancelled.', 409);
      }
      await env.DB.prepare(
        'UPDATE promotions SET status = \'cancelled\', updated_at = ? WHERE id = ?',
      ).bind(nowIso(), params.id).run();
      await recordAudit(env, {
        actorId: admin.id, actorEmail: admin.email,
        action: 'ad.promotion.cancelled', targetType: 'promotion', targetId: params.id,
        detail: `${ad.title} · ৳${row.amount}`,
      });
    } else if (act === 'refund') {
      if (row.status !== 'approved') {
        throw new HttpError('Only approved promotions can be refunded.', 409);
      }
      await env.DB.prepare(
        'UPDATE promotions SET status = \'refunded\', updated_at = ? WHERE id = ?',
      ).bind(nowIso(), params.id).run();
      // Refunding undoes the feature the approval set.
      if (ad.status === 'active') {
        await env.DB.prepare(
          'UPDATE ads SET featured = 0, updated_at = ? WHERE id = ?',
        ).bind(nowIso(), ad.id).run();
      }
      await recordAudit(env, {
        actorId: admin.id, actorEmail: admin.email,
        action: 'ad.promotion.refunded', targetType: 'promotion', targetId: params.id,
        detail: `${ad.title} · ৳${row.amount}`,
      });
    }

    // `row` was read before the UPDATE, so report the new status explicitly.
    const newStatus = act === 'approve' ? 'approved' : act === 'cancel'
      ? 'cancelled' : 'refunded';
    return json({ ok: true, status: newStatus });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
