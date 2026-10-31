/* ==========================================================================
   GET /api/admin/users — searchable, filterable member list
   ========================================================================== */

import { json, handleError, corsHeaders } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/auth.js';
import { listUsers } from '../../_lib/users.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(env, request);
    return json(await listUsers(env, new URL(request.url)));
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
