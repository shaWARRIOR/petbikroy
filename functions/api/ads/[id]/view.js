/* ==========================================================================
   POST /api/ads/:id/view
   Counts one view per visitor per day, mirroring the client-side behaviour
   without trusting the client.
   ========================================================================== */

import { json, handleError, clientIp, notFound } from '../../../_lib/http.js';
import { softRateLimit } from '../../../_lib/db.js';
import { sha256Hex } from '../../../_lib/auth.js';

const ONE_DAY = 86400;

export async function onRequestPost({ request, env, params }) {
  try {
    const exists = await env.DB.prepare('SELECT id FROM ads WHERE id = ?')
      .bind(params.id).first();
    if (!exists) throw notFound('That ad does not exist.');

    // Hash the IP so raw addresses are never stored in the counter table.
    const ipHash = (await sha256Hex(clientIp(request))).slice(0, 16);
    const { allowed } = await softRateLimit(env, `view:${params.id}:${ipHash}`, 1, ONE_DAY);

    if (allowed) {
      await env.DB.prepare('UPDATE ads SET views = views + 1 WHERE id = ?')
        .bind(params.id).run();
    }

    const row = await env.DB.prepare('SELECT views FROM ads WHERE id = ?')
      .bind(params.id).first();

    return json({ counted: allowed, views: row?.views ?? 0 });
  } catch (e) {
    return handleError(e, request, env);
  }
}
