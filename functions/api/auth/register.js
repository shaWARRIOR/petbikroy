/* ==========================================================================
   POST /api/auth/register — create a member account and sign in

   The phone number is the login identifier, so it must be unique. A new
   account is signed in immediately: there is no email confirmation step,
   because there is no email requirement.
   ========================================================================== */

import { json, readJson, handleError, clientIp, corsHeaders } from '../../_lib/http.js';
import { rateLimit, loadTaxonomy, getSettings } from '../../_lib/db.js';
import { registerUser, sessionCookie } from '../../_lib/auth.js';
import { validateRegistration, assertValid } from '../../_lib/validate.js';
import { ownProfile } from '../../_lib/users.js';

/** Sign-ups are the most attractive endpoint to a script, so cap them. */
const SIGNUPS_PER_IP = 10;
const SIGNUP_WINDOW = 3600;

export async function onRequestPost({ request, env }) {
  try {
    // The cap is a setting rather than a constant so it can be loosened on a
    // shared or carrier-NAT address without a redeploy.
    const settings = await getSettings(env);
    const limit = Number(settings.signup_limit) || SIGNUPS_PER_IP;
    await rateLimit(env, `signup:${clientIp(request)}`, limit, SIGNUP_WINDOW);

    const body = await readJson(request, 8 * 1024);
    const taxonomy = await loadTaxonomy(env);
    const account = assertValid(validateRegistration(body, taxonomy), 'account');

    const { token, id } = await registerUser(env, request, account);

    return json({ user: await ownProfile(env, id) }, {
      status: 201,
      headers: { 'set-cookie': sessionCookie(token, 'user') },
    });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
