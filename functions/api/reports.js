/* ==========================================================================
   POST /api/reports   — flag an ad for a moderator
   ========================================================================== */

import { json, readJson, handleError, clientIp, newId, nowIso, str, badRequest, conflict } from '../_lib/http.js';
import { rateLimit } from '../_lib/db.js';
import { recordAudit } from '../_lib/auth.js';

const REASONS = [
  'Scam or fraud',
  'Animal welfare concern',
  'Wrong category',
  'Duplicate ad',
  'Already sold',
  'Offensive content',
  'Other',
];

export async function onRequestGet() {
  return json({ reasons: REASONS });
}

export async function onRequestPost({ request, env }) {
  try {
    await rateLimit(env, `report:${clientIp(request)}`, 10, 3600);

    const body = await readJson(request, 8 * 1024);
    const adId = str(body.adId, 40);
    const reason = str(body.reason, 60);

    if (!adId) throw badRequest('Which ad are you reporting?');
    if (!REASONS.includes(reason)) throw badRequest('Choose a reason.');

    const ad = await env.DB.prepare('SELECT id FROM ads WHERE id = ?').bind(adId).first();
    if (!ad) throw badRequest('That ad does not exist.');

    // One report per ad per IP — extra reports add noise, not signal.
    const ip = clientIp(request);
    const existing = await env.DB.prepare(
      "SELECT id FROM reports WHERE ad_id = ? AND reporter_contact = ? AND status = 'open'",
    ).bind(adId, `ip:${ip}`).first();
    if (existing) throw conflict('You have already reported this ad.');

    const id = newId('rep-');
    await env.DB.prepare(
      `INSERT INTO reports (id, ad_id, reason, note, reporter_contact, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?)`,
    ).bind(
      id, adId, reason, str(body.note, 500), `ip:${ip}`, nowIso(),
    ).run();

    await recordAudit(env, {
      action: 'report.created', targetType: 'ad', targetId: adId, detail: reason,
    });

    return json({ ok: true, id }, { status: 201 });
  } catch (e) {
    return handleError(e, request, env);
  }
}
