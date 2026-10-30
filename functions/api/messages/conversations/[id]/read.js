/* ==========================================================================
   PATCH /api/messages/conversations/:id/read — mark a thread as read
   ========================================================================== */

import { json, handleError, corsHeaders } from '../../../../_lib/http.js';
import { requireUser } from '../../../../_lib/auth.js';
import { markRead } from '../../../../_lib/messages.js';

export async function onRequestPatch({ request, env, params }) {
  try {
    const user = await requireUser(env, request);
    const unread = await markRead(env, params.id, user.id);
    return json({ unread });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
