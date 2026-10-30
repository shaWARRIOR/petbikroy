/* ==========================================================================
   /api/messages/conversations
     GET    — my message threads (list view)
     POST   — start a thread with a seller (buyer-initiated)
   ========================================================================== */

import { json, readJson, handleError, corsHeaders } from '../../../_lib/http.js';
import { requireUser } from '../../../_lib/auth.js';
import { listConversations, startConversation } from '../../../_lib/messages.js';

export async function onRequestGet({ request, env }) {
  try {
    const user = await requireUser(env, request);
    const conversations = await listConversations(env, user.id);
    return json({ conversations });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const user = await requireUser(env, request);
    const body = await readJson(request, 8 * 1024);

    const { conversation, message } = await startConversation(env, {
      callerId: user.id,
      adId: body.adId || null,
      sellerId: body.sellerId || null,
      body: body.message || body.body,
    });

    return json({ conversation, message }, { status: 201 });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
