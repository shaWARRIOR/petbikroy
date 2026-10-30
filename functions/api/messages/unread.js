/* ==========================================================================
   GET /api/messages/unread — total unread messages (for the header badge)
   ========================================================================== */

import { json, handleError, corsHeaders } from '../../_lib/http.js';
import { requireUser } from '../../_lib/auth.js';
import { unreadTotal } from '../../_lib/messages.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireUser(env, request);
    const total = await unreadTotal(env, user.id);
    return json({ total });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
