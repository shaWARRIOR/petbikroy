/* ==========================================================================
   GET /api/messages/conversations/:id — one thread with its messages
   ========================================================================== */

import { json, handleError, corsHeaders } from '../../../_lib/http.js';
import { requireUser } from '../../../_lib/auth.js';
import { getConversation } from '../../../_lib/messages.js';

export async function onRequestGet({ request, env, params }) {
  try {
    const user = await requireUser(env, request);
    const data = await getConversation(env, params.id, user.id);
    if (!data) return json({ error: 'That conversation could not be found.' }, { status: 404 });
    return json(data);
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
