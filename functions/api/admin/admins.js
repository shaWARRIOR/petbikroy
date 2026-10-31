/* ==========================================================================
   /api/admin/admins
     GET  — list admins (no password material ever leaves the database)
     POST — create an admin (admins only)
   ========================================================================== */

import {
  json, readJson, handleError, corsHeaders, badRequest, conflict, str, HttpError,
} from '../../_lib/http.js';
import { requireAdmin, hashPassword, recordAudit } from '../../_lib/auth.js';
import { newId } from '../../_lib/http.js';

const MIN_PASSWORD = 10;

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(env, request, ['admin']);
    const rows = await env.DB.prepare(
      `SELECT id, email, name, role, is_active, last_login_at, created_at
         FROM admins ORDER BY created_at`,
    ).all();
    return json({ admins: rows.results ?? [] });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const actor = await requireAdmin(env, request, ['admin']);
    const body = await readJson(request, 8 * 1024);

    const email = str(body.email, 160).toLowerCase();
    const name = str(body.name, 80);
    const password = String(body.password ?? '');
    const role = body.role === 'moderator' ? 'moderator' : 'admin';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw badRequest('Enter a valid email address.', { email: 'Invalid email.' });
    }
    if (password.length < MIN_PASSWORD) {
      throw badRequest('Password is too short.', {
        password: `Use at least ${MIN_PASSWORD} characters.`,
      });
    }
    if (password.length > 200) throw badRequest('Password is too long.');

    const existing = await env.DB.prepare('SELECT id FROM admins WHERE email = ?')
      .bind(email).first();
    if (existing) throw conflict('An admin with that email already exists.');

    const { hash, salt, iterations } = await hashPassword(password);
    const id = newId('adm-');

    await env.DB.prepare(
      `INSERT INTO admins (id, email, name, password_hash, password_salt, iterations,
                           role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    ).bind(id, email, name, hash, salt, iterations, role, new Date().toISOString()).run();

    await recordAudit(env, {
      actorId: actor.id, actorEmail: actor.email, action: 'admin.created',
      targetType: 'admin', targetId: id, detail: `${email} (${role})`,
    });

    return json({ admin: { id, email, name, role } }, { status: 201 });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
