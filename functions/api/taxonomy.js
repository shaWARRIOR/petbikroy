/* ==========================================================================
   GET /api/taxonomy
   Categories (with breeds) and divisions (with areas), straight from D1 so the
   admin panel can edit them and the public site picks the change up.
   ========================================================================== */

import { json, handleError } from '../_lib/http.js';
import { taxonomyPayload } from '../_lib/db.js';

export async function onRequestGet({ request, env }) {
  try {
    const data = await taxonomyPayload(env);
    return json(data, { cache: 'public, max-age=300, stale-while-revalidate=3600' });
  } catch (e) {
    return handleError(e, request, env);
  }
}
