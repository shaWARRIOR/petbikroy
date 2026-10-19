/* ==========================================================================
   PUT /api/auth/password — change my password

   Changing the password signs every other device out: all of the account's
   sessions are dropped and a fresh one is issued to the caller. That is the
   behaviour you want if the reason for changing it is that someone else may
   know it.
   ========================================================================== */

import {
  json, readJson, handleError, corsHeaders, unauthorized,
} from '../../_lib/http.js';
import { rateLimit } from '../../_lib/db.js';
import {
  requireUser, verifyPassword, setUserPassword, createSession,
  sessionCookie, recordAudit,
} from '../../_lib/auth.js';
import { validatePasswordChange, assertValid } from '../../_lib/validate.js';

export async function onRequestPut({ request, env }) {
  try {
    const session = await requireUser(env, request);
    await rateLimit(env, `passwd:${session.id}`, 10, 3600);

    const body = await readJson(request, 4 * 1024);
    const { current, next } = assertValid(validatePasswordChange(body), 'passwords');

    const row = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(session.id).first();
    if (!row) throw unauthorized('Sign in again to continue.');

    if (!await verifyPassword(current, row)) {
      throw unauthorized('Your current password is not right.');
    }

    await setUserPassword(env, session.id, next);

    await env.DB.prepare("DELETE FROM sessions WHERE kind = 'user' AND user_id = ?")
      .bind(session.id).run();
    const token = await createSession(env, 'user', session.id, request);

    await recordAudit(env, {
      actorId: session.id, actorEmail: session.phone,
      action: 'user.password_changed', targetType: 'user', targetId: session.id,
    });

    return json(
      { ok: true },
      { headers: { 'set-cookie': sessionCookie(token, 'user') } },
    );
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
