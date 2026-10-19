/* ==========================================================================
   /api/admin/session
     POST   — sign in
     GET    — who am I
     DELETE — sign out
   ========================================================================== */

import {
  json, readJson, handleError, clientIp, str, corsHeaders, unauthorized,
} from '../../_lib/http.js';
import { rateLimit } from '../../_lib/db.js';
import {
  loginAdmin, getAdminSession, destroySession, sessionCookie, clearSessionCookie,
} from '../../_lib/auth.js';

/** Stops password spraying across many accounts from one address. */
const LOGIN_ATTEMPTS_PER_IP = 20;
const LOGIN_WINDOW = 3600;

export async function onRequestPost({ request, env }) {
  try {
    await rateLimit(env, `login:${clientIp(request)}`, LOGIN_ATTEMPTS_PER_IP, LOGIN_WINDOW);

    const body = await readJson(request, 4 * 1024);
    const email = str(body.email, 160);
    const password = String(body.password ?? '');

    if (!email || !password) {
      throw unauthorized('Enter your email and password.');
    }
    if (password.length > 200) throw unauthorized('Incorrect email or password.');

    const { token, admin } = await loginAdmin(env, request, email, password);

    return json({ admin }, {
      headers: { 'set-cookie': sessionCookie(token, 'admin') },
    });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestGet({ request, env }) {
  try {
    const admin = await getAdminSession(env, request);
    // 200 with null rather than 401: "not signed in" is a normal state the
    // admin panel checks on load, not an error.
    return json({ admin });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    await destroySession(env, request, 'admin');
    return json({ ok: true }, { headers: { 'set-cookie': clearSessionCookie('admin') } });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
