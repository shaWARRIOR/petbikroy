/* ==========================================================================
   /api/admin/ads/:id
     GET    — full detail including private contact fields
     PATCH  — moderate: approve, reject, feature, mark sold
     DELETE — remove permanently
   ========================================================================== */

import {
  json, readJson, handleError, corsHeaders, notFound, badRequest,
  nowIso, str, HttpError,
} from '../../../_lib/http.js';
import { requireAdmin, recordAudit } from '../../../_lib/auth.js';
import { fetchPhotos } from '../../../_lib/ads.js';
import { toAdminAd } from '../../../_lib/mappers.js';

/**
 * Moderation actions.
 * `role` is checked so a moderator cannot grant themselves extra powers.
 */
const ACTIONS = {
  approve: { status: 'active', roles: ['admin', 'moderator'] },
  reject:  { status: 'rejected', roles: ['admin', 'moderator'] },
  pending: { status: 'pending', roles: ['admin', 'moderator'] },
  sold:    { status: 'sold', roles: ['admin', 'moderator'] },
  feature: { featured: 1, roles: ['admin'] },
  unfeature: { featured: 0, roles: ['admin'] },
};

async function load(env, id) {
  const row = await env.DB.prepare('SELECT * FROM ads WHERE id = ?').bind(id).first();
  if (!row) throw notFound('That ad does not exist.');
  return row;
}

export async function onRequestGet({ request, env, params }) {
  try {
    await requireAdmin(env, request);
    const row = await load(env, params.id);
    const photos = await fetchPhotos(env, row.id);
    return json({ ad: toAdminAd(row, photos) });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestPatch({ request, env, params }) {
  try {
    const admin = await requireAdmin(env, request);
    const row = await load(env, params.id);

    const body = await readJson(request, 8 * 1024);
    const action = str(body.action, 30);

    // Reassignment is the one moderation action that needs a target account,
    // so it is handled before the simple status actions.
    if (action === 'reassign') {
      if (admin.role !== 'admin') {
        throw new HttpError('Only an administrator can move an ad to another member.', 403);
      }
      const userId = str(body.userId, 60);
      if (!userId) throw badRequest('Choose the member who should own this ad.');

      const target = await env.DB.prepare('SELECT id, name FROM users WHERE id = ?')
        .bind(userId).first();
      if (!target) throw badRequest('That member does not exist.');

      await env.DB.prepare('UPDATE ads SET user_id = ?, updated_at = ? WHERE id = ?')
        .bind(target.id, nowIso(), params.id).run();

      await recordAudit(env, {
        actorId: admin.id, actorEmail: admin.email,
        action: 'ad.reassigned', targetType: 'ad', targetId: params.id,
        detail: `${row.title} -> ${target.name}`,
      });

      const moved = await load(env, params.id);
      return json({ ad: toAdminAd(moved, await fetchPhotos(env, params.id)) });
    }

    const spec = ACTIONS[action];

    if (!spec) throw badRequest('Unknown action.');
    if (!spec.roles.includes(admin.role)) {
      throw new HttpError('Your role does not allow that action.', 403);
    }

    const sets = [];
    const binds = [];

    if (spec.status) {
      sets.push('status = ?');
      binds.push(spec.status);
      if (spec.status === 'active' && !row.published_at) {
        sets.push('published_at = ?');
        binds.push(nowIso());
      }
      // Clear any previous rejection note once an ad goes live again.
      if (spec.status !== 'rejected') sets.push("rejection_reason = ''");
    }
    if (spec.featured !== undefined) {
      sets.push('featured = ?');
      binds.push(spec.featured);
    }

    // A rejection should say why — the poster sees this.
    if (spec.status === 'rejected') {
      const reason = str(body.reason, 300);
      sets.push('rejection_reason = ?');
      binds.push(reason || 'Did not meet our listing guidelines.');
    }

    sets.push('updated_at = ?');
    binds.push(nowIso());
    binds.push(params.id);

    await env.DB.prepare(`UPDATE ads SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...binds).run();

    await recordAudit(env, {
      actorId: admin.id, actorEmail: admin.email,
      action: `ad.${action}`, targetType: 'ad', targetId: params.id, detail: row.title,
    });

    const updated = await load(env, params.id);
    const photos = await fetchPhotos(env, params.id);
    return json({ ad: toAdminAd(updated, photos) });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const admin = await requireAdmin(env, request);
    const row = await load(env, params.id);

    const keys = await env.DB.prepare('SELECT r2_key FROM ad_photos WHERE ad_id = ?')
      .bind(params.id).all();
    const objects = (keys.results ?? []).map(k => k.r2_key);

    await env.DB.prepare('DELETE FROM ads WHERE id = ?').bind(params.id).run();
    if (objects.length && env.IMAGES) {
      try { await env.IMAGES.delete(objects); }
      catch (err) { console.error('R2 cleanup failed', err); }
    }

    await recordAudit(env, {
      actorId: admin.id, actorEmail: admin.email,
      action: 'ad.deleted.admin', targetType: 'ad', targetId: params.id, detail: row.title,
    });

    return json({ ok: true });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
