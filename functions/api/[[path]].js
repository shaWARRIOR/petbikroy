/* ==========================================================================
   Catch-all for /api/*

   Without this, a typo'd endpoint falls through to Cloudflare Pages' static
   handling and an API client gets an HTML page with a 200 — which is exactly
   the kind of thing that turns a five-minute bug into an afternoon.

   Pages matches the most specific route first, so every real endpoint
   (functions/api/ads/index.js and friends) still wins. This only sees
   requests that nothing else claimed.
   ========================================================================== */

import { jsonError } from '../_lib/http.js';

const KNOWN = [
  'GET     /api/ads',
  'POST    /api/ads',
  'GET     /api/ads/:id',
  'PUT     /api/ads/:id',
  'DELETE  /api/ads/:id',
  'POST    /api/ads/:id/view',
  'GET     /api/taxonomy',
  'GET     /api/stats',
  'GET     /api/reports',
  'POST    /api/reports',
  'POST    /api/upload',
  'GET     /img/*',
  'POST    /api/auth/register',
  'POST    /api/auth/login',
  'GET     /api/auth/session',
  'PATCH   /api/auth/session',
  'DELETE  /api/auth/session',
  'PUT     /api/auth/password',
  'GET     /api/me/ads',
  'GET     /api/users/:id',
  'POST    /api/admin/session',
  'GET     /api/admin/session',
  'DELETE  /api/admin/session',
  'GET     /api/admin/overview',
  'GET     /api/admin/ads',
  'GET     /api/admin/ads/:id',
  'PATCH   /api/admin/ads/:id',
  'DELETE  /api/admin/ads/:id',
  'GET     /api/admin/users',
  'GET     /api/admin/users/:id',
  'PATCH   /api/admin/users/:id',
  'DELETE  /api/admin/users/:id',
  'GET     /api/admin/reports',
  'PATCH   /api/admin/reports',
  'GET     /api/admin/settings',
  'PUT     /api/admin/settings',
  'GET     /api/admin/admins',
  'POST    /api/admin/admins',
  'PATCH   /api/admin/admins/:id',
  'DELETE  /api/admin/admins/:id',
];

export async function onRequest({ request }) {
  const url = new URL(request.url);

  return jsonError(
    `No API endpoint matches ${request.method} ${url.pathname}`,
    404,
    { available: KNOWN },
  );
}
