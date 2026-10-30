/* ==========================================================================
   /api/messages/conversations/:id/messages
     GET    — the messages in one thread (since the caller last read it)
     POST   — send a message in one thread
   ========================================================================== */

import { json, readJson, handleError, corsHeaders } from '../../../../../_lib/http.js';
import { requireUser } from '../../../../../_lib/auth.js';
import { getConversation, sendMessage } from '../../../../../_lib/messages.js';

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

export async function onRequestPost({ request, env, params }) {
  try {
    const user = await requireUser(env, request);
    const body = await readJson(request, 8 * 1024);
    const message = await sendMessage(env, {
      convId: params.id,
      senderId: user.id,
      body: body.message || body.body,
    });
    return json({ message }, { status: 201 });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
