/* ==========================================================================
   /api/auth/session
     GET    — who am I
     PATCH  — update my profile
     DELETE — sign out
   ========================================================================== */

import {
  json, readJson, handleError, corsHeaders, nowIso, unauthorized,
} from '../../_lib/http.js';
import { rateLimit, loadTaxonomy } from '../../_lib/db.js';
import {
  getUserSession, requireUser, destroySession, clearSessionCookie,
} from '../../_lib/auth.js';
import { validateProfile, assertValid } from '../../_lib/validate.js';
import { ownProfile } from '../../_lib/users.js';

export async function onRequestGet({ request, env }) {
  try {
    const session = await getUserSession(env, request);
    // 200 with null, not 401: every page asks this on load, and "not signed
    // in" is an ordinary state rather than an error.
    if (!session) return json({ user: null });

    const user = await ownProfile(env, session.id);
    return json({ user });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestPatch({ request, env }) {
  try {
    const session = await requireUser(env, request);
    await rateLimit(env, `profile:${session.id}`, 30, 3600);

    const body = await readJson(request, 8 * 1024);
    const taxonomy = await loadTaxonomy(env);
    const profile = assertValid(validateProfile(body, taxonomy), 'profile');

    const result = await env.DB.prepare(
      `UPDATE users
          SET name = ?, email = ?, bio = ?, location_id = ?, area = ?, updated_at = ?
        WHERE id = ?`,
    ).bind(
      profile.name, profile.email, profile.bio,
      profile.locationId || null, profile.area, nowIso(), session.id,
    ).run();

    if (!result.meta?.changes) throw unauthorized('Sign in again to continue.');

    return json({ user: await ownProfile(env, session.id) });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestDelete({ request, env }) {
  try {
    await destroySession(env, request, 'user');
    return json({ ok: true }, { headers: { 'set-cookie': clearSessionCookie('user') } });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
