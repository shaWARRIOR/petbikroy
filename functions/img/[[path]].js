/* ==========================================================================
   GET /img/*   — serves uploaded photos from R2
   Only objects under the `ads/` prefix are reachable, so nothing else in the
   bucket can be enumerated through this route.
   ========================================================================== */

import { handleError, notFound, badRequest } from '../_lib/http.js';

export async function onRequestGet({ request, env, params }) {
  try {
    if (!env.IMAGES) throw notFound('Image storage is not configured.');

    // A catch-all segment arrives as a string, but normalise arrays too.
    const key = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');

    if (!key) throw badRequest('No image requested.');
    if (!key.startsWith('ads/') || key.includes('..')) {
      throw notFound('Not found');
    }

    const object = await env.IMAGES.get(key);
    if (!object) throw notFound('Image not found');

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');
    headers.set('x-content-type-options', 'nosniff');

    // Conditional request support — the ETag is derived from the object.
    if (request.headers.get('if-none-match') === object.httpEtag) {
      return new Response(null, { status: 304, headers });
    }

    return new Response(object.body, { headers });
  } catch (e) {
    if (e && e.status === 404) {
      return new Response('Not found', { status: 404 });
    }
    return handleError(e, request, env);
  }
}
