/* ==========================================================================
   POST /api/ads/:id/promote
   Toggles the `featured` flag so the ad appears in the "Promoted ads" section
   and floats to the top of default results.

   This is a lightweight owner action, so it does not go through the full PUT
   ad validation — the caller only flips one flag. It lives in its own route
   file because Pages matches `functions/api/ads/[id].js` to `/api/ads/{id}`
   only; the extra `/promote` segment needs its own 3-segment route.
   ========================================================================== */

import {
  json, handleError, notFound, HttpError,
  corsHeaders, nowIso,
} from '../../../_lib/http.js';
import { fetchPhotos } from '../../../_lib/ads.js';
import { toPublicAdDetail } from '../../../_lib/mappers.js';
import { recordAudit, requireUser } from '../../../_lib/auth.js';

export async function onRequestPost({ request, env, params }) {
  try {
    const row = await env.DB.prepare('SELECT * FROM ads WHERE id = ?')
      .bind(params.id).first();
    if (!row) throw notFound('That ad does not exist.');

    // Only a live ad can be promoted; promoting a sold, pending or rejected
    // ad is a no-op, surfaced as a clear 409 rather than a silent success.
    if (row.status !== 'active') {
      throw new HttpError('Only active ads can be promoted.', 409);
    }

    const user = await requireUser(env, request);
    if (user.id !== row.user_id) {
      throw new HttpError('You can only promote your own ad.', 403);
    }

    const featured = row.featured ? 0 : 1;
    await env.DB.prepare('UPDATE ads SET featured = ?, updated_at = ? WHERE id = ?')
      .bind(featured, nowIso(), params.id).run();

    await recordAudit(env, {
      actorId: user.id, actorEmail: user.phone,
      action: featured ? 'ad.promoted' : 'ad.unpromoted',
      targetType: 'ad', targetId: params.id, detail: row.title,
    });

    const updated = await env.DB.prepare('SELECT * FROM ads WHERE id = ?')
      .bind(params.id).first();
    const photos = await fetchPhotos(env, params.id);
    return json({ ad: toPublicAdDetail(updated, photos, { canManage: true, isOwner: true }) });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
