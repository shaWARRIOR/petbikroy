/* ==========================================================================
   GET /api/admin/overview   — dashboard metrics
   ========================================================================== */

import { json, handleError, corsHeaders } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/auth.js';
import { adCounts } from '../../_lib/ads.js';
import { userCounts } from '../../_lib/users.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(env, request);

    const [counts, members] = await Promise.all([
      adCounts(env),
      userCounts(env),
    ]);

    const [reports, recent, byCat, byLoc, daily] = await Promise.all([
      env.DB.prepare(
        "SELECT COUNT(*) AS n FROM reports WHERE status = 'open'",
      ).first(),
      env.DB.prepare(
        `SELECT id, title, status, created_at, category_id
           FROM ads ORDER BY created_at DESC LIMIT 8`,
      ).all(),
      env.DB.prepare(
        `SELECT c.name AS name, COUNT(a.id) AS n
           FROM categories c LEFT JOIN ads a
             ON a.category_id = c.id AND a.status = 'active'
          GROUP BY c.id ORDER BY n DESC, c.sort_order`,
      ).all(),
      env.DB.prepare(
        `SELECT l.name AS name, COUNT(a.id) AS n
           FROM locations l LEFT JOIN ads a
             ON a.location_id = l.id AND a.status = 'active'
          GROUP BY l.id ORDER BY n DESC, l.sort_order`,
      ).all(),
      // Ads published per day for the last two weeks, for the sparkline.
      env.DB.prepare(
        `SELECT substr(COALESCE(published_at, created_at), 1, 10) AS day,
                COUNT(*) AS n
           FROM ads
          WHERE COALESCE(published_at, created_at) > ?
          GROUP BY day ORDER BY day`,
      ).bind(new Date(Date.now() - 14 * 86400_000).toISOString()).all(),
    ]);

    const admins = await env.DB.prepare('SELECT COUNT(*) AS n FROM admins').first();
    const audit = await env.DB.prepare(
      `SELECT actor_email, action, target_type, target_id, detail, created_at
         FROM audit_log ORDER BY created_at DESC LIMIT 12`,
    ).all();

    return json({
      counts,
      members,
      openReports: reports?.n ?? 0,
      admins: admins?.n ?? 0,
      recentAds: recent.results ?? [],
      byCategory: byCat.results ?? [],
      byLocation: byLoc.results ?? [],
      daily: daily.results ?? [],
      audit: audit.results ?? [],
    });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
