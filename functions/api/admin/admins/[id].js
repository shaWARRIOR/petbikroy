/* ==========================================================================
   /api/admin/admins/:id
     PATCH  — change name/role/active state, or set a new password
     DELETE — remove an admin
   ========================================================================== */

import {
  json, readJson, handleError, corsHeaders, badRequest, notFound,
  str, HttpError,
} from '../../../_lib/http.js';
import { requireAdmin, hashPassword, recordAudit } from '../../../_lib/auth.js';

const MIN_PASSWORD = 10;

export async function onRequestPatch({ request, env, params }) {
  try {
    const actor = await requireAdmin(env, request, ['admin']);
    const body = await readJson(request, 8 * 1024);

    const target = await env.DB.prepare('SELECT * FROM admins WHERE id = ?')
      .bind(params.id).first();
    if (!target) throw notFound('No such admin.');

    const sets = [];
    const binds = [];
    const isSelf = target.id === actor.id;

    // Self-demotion or self-deactivation would lock the last admin out.
    if (isSelf && (body.role !== undefined || body.is_active !== undefined)) {
      const others = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM admins WHERE id != ? AND role = 'admin' AND is_active = 1",
      ).bind(actor.id).first();
      if (!others?.n) {
        throw badRequest('You are the only active admin, so you cannot change your own role or disable yourself.');
      }
    }

    if (body.name !== undefined) {
      sets.push('name = ?');
      binds.push(str(body.name, 80));
    }
    if (body.role !== undefined) {
      if (!['admin', 'moderator'].includes(body.role)) throw badRequest('Unknown role.');
      sets.push('role = ?');
      binds.push(body.role);
    }
    if (body.is_active !== undefined) {
      sets.push('is_active = ?');
      binds.push(body.is_active ? 1 : 0);
      // Deactivating an admin should end their sessions immediately.
      if (!body.is_active) {
        await env.DB.prepare('DELETE FROM sessions WHERE admin_id = ?').bind(target.id).run();
      }
    }

    if (body.password !== undefined) {
      const password = String(body.password);
      if (password.length < MIN_PASSWORD) {
        throw badRequest('Password is too short.', {
          password: `Use at least ${MIN_PASSWORD} characters.`,
        });
      }
      const { hash, salt, iterations } = await hashPassword(password);
      sets.push('password_hash = ?', 'password_salt = ?', 'iterations = ?');
      binds.push(hash, salt, iterations);
      // A password change invalidates existing sessions for that admin.
      await env.DB.prepare('DELETE FROM sessions WHERE admin_id = ?').bind(target.id).run();
    }

    if (!sets.length) throw badRequest('Nothing to update.');

    if (body.unlock) {
      sets.push('locked_until = NULL', 'failed_attempts = 0');
    }

    binds.push(target.id);
    await env.DB.prepare(`UPDATE admins SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...binds).run();

    await recordAudit(env, {
      actorId: actor.id, actorEmail: actor.email, action: 'admin.updated',
      targetType: 'admin', targetId: target.id, detail: target.email,
    });

    const updated = await env.DB.prepare(
      'SELECT id, email, name, role, is_active, last_login_at, created_at FROM admins WHERE id = ?',
    ).bind(target.id).first();

    return json({ admin: updated });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const actor = await requireAdmin(env, request, ['admin']);

    if (params.id === actor.id) {
      throw badRequest('You cannot delete your own account.');
    }

    const target = await env.DB.prepare('SELECT * FROM admins WHERE id = ?')
      .bind(params.id).first();
    if (!target) throw notFound('No such admin.');

    // Never allow the last admin to be removed.
    const remaining = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM admins WHERE id != ? AND role = 'admin' AND is_active = 1",
    ).bind(target.id).first();
    if (target.role === 'admin' && !remaining?.n) {
      throw new HttpError('That is the last admin account and cannot be removed.', 400);
    }

    await env.DB.prepare('DELETE FROM admins WHERE id = ?').bind(target.id).run();

    await recordAudit(env, {
      actorId: actor.id, actorEmail: actor.email, action: 'admin.deleted',
      targetType: 'admin', targetId: target.id, detail: target.email,
    });

    return json({ ok: true });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
