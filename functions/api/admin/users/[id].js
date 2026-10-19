/* ==========================================================================
   /api/admin/users/:id
     GET    — profile plus every listing they own
     PATCH  — verify, activate/deactivate, reset a password
     DELETE — delete the account, its listings and their photos
   ========================================================================== */

import {
  json, readJson, handleError, corsHeaders, notFound, badRequest,
  nowIso, str, HttpError,
} from '../../../_lib/http.js';
import {
  requireAdmin, recordAudit, suggestPassword, setUserPassword,
} from '../../../_lib/auth.js';
import { toAdminAd, toAdminUser } from '../../../_lib/mappers.js';
import { userAds, countUserAds } from '../../../_lib/users.js';

/**
 * Account actions. Deactivating and deleting are administrator-only, because
 * either one can take a working seller off the site.
 */
const ACTIONS = {
  verify:     { verified: 1,   roles: ['admin', 'moderator'] },
  unverify:   { verified: 0,   roles: ['admin', 'moderator'] },
  activate:   { is_active: 1,  roles: ['admin'] },
  deactivate: { is_active: 0,  roles: ['admin'] },
};

async function load(env, id) {
  const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!row) throw notFound('That member does not exist.');
  return row;
}

async function shaped(env, row) {
  const counts = await countUserAds(env, row.id);
  return toAdminUser(row, { adCount: counts.total, activeAds: counts.active });
}

export async function onRequestGet({ request, env, params }) {
  try {
    await requireAdmin(env, request);
    const row = await load(env, params.id);
    const { rows, photoMap } = await userAds(env, row.id);

    return json({
      user: await shaped(env, row),
      ads: rows.map(r => toAdminAd(r, photoMap.get(r.id) ?? [])),
    });
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

    // Password reset lives here rather than behind email, because accounts
    // are keyed on a phone number and this site never sends mail. Without it
    // a member who forgets their password would be locked out for good.
    if (action === 'resetPassword') {
      if (admin.role !== 'admin') {
        throw new HttpError('Only an administrator can reset a password.', 403);
      }

      const password = suggestPassword();
      await setUserPassword(env, row.id, password);
      // Anyone holding an existing session for this account is signed out.
      await env.DB.prepare("DELETE FROM sessions WHERE kind = 'user' AND user_id = ?")
        .bind(row.id).run();

      await recordAudit(env, {
        actorId: admin.id, actorEmail: admin.email,
        action: 'user.password_reset', targetType: 'user', targetId: row.id,
        detail: row.phone,
      });

      // Returned exactly once; nothing stores the plain text.
      return json({ ok: true, password });
    }

    const spec = ACTIONS[action];
    if (!spec) throw badRequest('Unknown action.');
    if (!spec.roles.includes(admin.role)) {
      throw new HttpError('Your role does not allow that action.', 403);
    }

    const sets = [];
    const binds = [];
    if (spec.verified !== undefined) { sets.push('verified = ?'); binds.push(spec.verified); }
    if (spec.is_active !== undefined) { sets.push('is_active = ?'); binds.push(spec.is_active); }
    sets.push('updated_at = ?');
    binds.push(nowIso(), params.id);

    await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...binds).run();

    // Deactivating has to take the sessions with it, otherwise the person
    // stays signed in until the cookie happens to expire.
    if (spec.is_active === 0) {
      await env.DB.prepare("DELETE FROM sessions WHERE kind = 'user' AND user_id = ?")
        .bind(row.id).run();
    }

    await recordAudit(env, {
      actorId: admin.id, actorEmail: admin.email,
      action: `user.${action}`, targetType: 'user', targetId: row.id,
      detail: row.name,
    });

    return json({ user: await shaped(env, await load(env, params.id)) });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const admin = await requireAdmin(env, request, ['admin']);
    const row = await load(env, params.id);

    // Collect the R2 keys first — once the rows are gone there is no record
    // of which objects belonged to this member.
    const keys = await env.DB.prepare(
      `SELECT r2_key FROM ad_photos
        WHERE ad_id IN (SELECT id FROM ads WHERE user_id = ?)`,
    ).bind(row.id).all();
    const objects = (keys.results ?? []).map(k => k.r2_key);

    // Deleted in dependency order rather than leaning on ON DELETE CASCADE,
    // so the outcome does not depend on whether foreign keys happen to be
    // enforced on the connection.
    await env.DB.batch([
      env.DB.prepare(
        'DELETE FROM ad_photos WHERE ad_id IN (SELECT id FROM ads WHERE user_id = ?)',
      ).bind(row.id),
      env.DB.prepare(
        'DELETE FROM reports WHERE ad_id IN (SELECT id FROM ads WHERE user_id = ?)',
      ).bind(row.id),
      env.DB.prepare('DELETE FROM ads WHERE user_id = ?').bind(row.id),
      env.DB.prepare("DELETE FROM sessions WHERE kind = 'user' AND user_id = ?").bind(row.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(row.id),
    ]);

    if (objects.length && env.IMAGES) {
      try { await env.IMAGES.delete(objects); }
      catch (err) { console.error('R2 cleanup failed', err); }
    }

    await recordAudit(env, {
      actorId: admin.id, actorEmail: admin.email,
      action: 'user.deleted', targetType: 'user', targetId: row.id,
      detail: `${row.name} (${row.phone})`,
    });

    return json({ ok: true, removedPhotos: objects.length });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
