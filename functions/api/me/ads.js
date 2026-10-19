/* ==========================================================================
   GET /api/me/ads — every listing I have posted, drafts included

   Unlike /api/ads this is not filtered to `active`, because the owner has to
   be able to see what is waiting for review and what a moderator rejected.
   ========================================================================== */

import { json, handleError, corsHeaders } from '../../_lib/http.js';
import { requireUser } from '../../_lib/auth.js';
import { userAds } from '../../_lib/users.js';
import { toPublicAdDetail } from '../../_lib/mappers.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireUser(env, request);
    const { rows, photoMap } = await userAds(env, user.id);

    // These are all the caller's own listings, so the full detail shape —
    // including the contact number, which the edit form has to send back —
    // and the moderation note are both safe to include.
    const ads = rows.map(row => ({
      ...toPublicAdDetail(row, photoMap.get(row.id) ?? [], { canManage: true }),
      rejectionReason: row.rejection_reason || '',
    }));

    const tally = status => ads.filter(a => a.status === status).length;

    return json({
      ads,
      total: ads.length,
      counts: {
        all: ads.length,
        active: tally('active'),
        pending: tally('pending'),
        rejected: tally('rejected'),
        sold: tally('sold'),
      },
    });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
