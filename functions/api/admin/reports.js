/* ==========================================================================
   /api/admin/reports
     GET   — the moderation queue
     PATCH — resolve or dismiss a report
   ========================================================================== */

import {
  json, readJson, handleError, corsHeaders, badRequest, notFound, str, nowIso,
} from '../../_lib/http.js';
import { requireAdmin, recordAudit } from '../../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(env, request);

    const url = new URL(request.url);
    const status = str(url.searchParams.get('status'), 20) || 'open';

    const rows = await env.DB.prepare(
      `SELECT r.id, r.ad_id, r.reason, r.note, r.status, r.created_at,
              a.title AS ad_title, a.status AS ad_status, a.contact_name
         FROM reports r
         LEFT JOIN ads a ON a.id = r.ad_id
        ${status === 'all' ? '' : 'WHERE r.status = ?'}
        ORDER BY r.created_at DESC LIMIT 200`,
    ).bind(...(status === 'all' ? [] : [status])).all();

    const counts = await env.DB.prepare(
      `SELECT status, COUNT(*) AS n FROM reports GROUP BY status`,
    ).all();

    const summary = { open: 0, resolved: 0, dismissed: 0 };
    for (const c of counts.results ?? []) summary[c.status] = c.n;

    return json({ reports: rows.results ?? [], summary });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const admin = await requireAdmin(env, request);
    const body = await readJson(request, 4 * 1024);

    const id = str(body.id, 40);
    const status = str(body.status, 20);
    if (!['resolved', 'dismissed', 'open'].includes(status)) {
      throw badRequest('Unknown report status.');
    }

    const report = await env.DB.prepare('SELECT * FROM reports WHERE id = ?')
      .bind(id).first();
    if (!report) throw notFound('No such report.');

    await env.DB.prepare('UPDATE reports SET status = ? WHERE id = ?')
      .bind(status, id).run();

    await recordAudit(env, {
      actorId: admin.id, actorEmail: admin.email, action: `report.${status}`,
      targetType: 'report', targetId: id, detail: report.reason,
    });

    return json({ ok: true, updatedAt: nowIso() });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
