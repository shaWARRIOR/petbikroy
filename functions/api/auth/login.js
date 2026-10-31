/* ==========================================================================
   POST /api/auth/login — sign in with a phone number and password
   ========================================================================== */

import {
  json, readJson, handleError, clientIp, str, corsHeaders, unauthorized,
} from '../../_lib/http.js';
import { rateLimit } from '../../_lib/db.js';
import { loginUser, sessionCookie } from '../../_lib/auth.js';
import { ownProfile } from '../../_lib/users.js';

/** Stopping password spraying from a single address. */
const ATTEMPTS_PER_IP = 20;
const WINDOW = 3600;

export async function onRequestPost({ request, env }) {
  try {
    await rateLimit(env, `userlogin:${clientIp(request)}`, ATTEMPTS_PER_IP, WINDOW);

    const body = await readJson(request, 4 * 1024);
    const phone = str(body.phone, 20);
    const password = String(body.password ?? '');

    if (!phone || !password) {
      throw unauthorized('Enter your phone number and password.');
    }
    // Cheap rejection before the expensive KDF.
    if (password.length > 200) throw unauthorized('Incorrect phone number or password.');

    const { token, id } = await loginUser(env, request, phone, password);

    // Shaped the same way the session probe shapes it, so the page does not
    // have to re-fetch the profile it was just handed.
    const user = await ownProfile(env, id);
    if (!user) throw unauthorized('Incorrect phone number or password');

    return json({ user }, {
      headers: { 'set-cookie': sessionCookie(token, 'user') },
    });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
