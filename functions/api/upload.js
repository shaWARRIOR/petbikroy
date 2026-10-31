/* ==========================================================================
   POST /api/upload   — image uploads to R2
   Accepts multipart/form-data with one or more `photos` fields and returns
   the object keys to pass back when creating the ad.
   ========================================================================== */

import {
  json, handleError, HttpError, badRequest, newId, corsHeaders,
} from '../_lib/http.js';
import { rateLimit } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';

const MAX_FILES = 6;
const MAX_BYTES = 5 * 1024 * 1024;          // per file
const UPLOAD_LIMIT = 40;                     // files per member per hour
const UPLOAD_WINDOW = 3600;

/** Only formats every browser can display. */
const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
]);

export async function onRequestPost({ request, env }) {
  try {
    // Photos only ever exist to be attached to a listing, and listings belong
    // to accounts. Without this, an anonymous script could fill the bucket.
    const user = await requireUser(env, request);

    if (!env.IMAGES) {
      throw new HttpError(
        'Image storage is not configured. Add an R2 binding named IMAGES to enable uploads.',
        503,
      );
    }

    const type = request.headers.get('content-type') || '';
    if (!type.includes('multipart/form-data')) {
      throw badRequest('Expected multipart/form-data');
    }

    // Bucketed per member rather than per address, so a shared connection
    // cannot spend somebody else's upload quota.
    await rateLimit(env, `upload:${user.id}`, UPLOAD_LIMIT, UPLOAD_WINDOW);

    const form = await request.formData();
    const files = form.getAll('photos').filter(f => f && typeof f === 'object' && 'arrayBuffer' in f);

    if (!files.length) throw badRequest('No photos were received.');
    if (files.length > MAX_FILES) {
      throw badRequest(`A maximum of ${MAX_FILES} photos is allowed.`);
    }

    // Sniff the real type from the first bytes rather than trusting the
    // Content-Type the browser claimed.
    const now = new Date();
    const prefix = `ads/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    const uploaded = [];
    for (const file of files) {
      if (file.size > MAX_BYTES) {
        throw new HttpError(
          `"${file.name || 'photo'}" is larger than ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`,
          413,
        );
      }

      const buf = await file.arrayBuffer();
      const sniffed = sniffImage(buf);
      if (!sniffed) {
        throw badRequest(`"${file.name || 'photo'}" is not a JPEG, PNG, WebP or GIF image.`);
      }

      const key = `${prefix}/${newId()}.${ALLOWED.get(sniffed)}`;
      await env.IMAGES.put(key, buf, {
        httpMetadata: {
          contentType: sniffed,
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });
      uploaded.push(key);
    }

    return json({ keys: uploaded, count: uploaded.length }, { status: 201 });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

/* ------------------------------------------------------------ magic bytes */

/** Identifies an image from its leading bytes. Returns a MIME type or null. */
function sniffImage(buf) {
  const b = new Uint8Array(buf);
  if (b.length < 12) return null;

  // JPEG: FF D8 FF
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'image/jpeg';

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'image/png';

  // GIF: "GIF87a" / "GIF89a"
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif';

  // WebP: "RIFF" .... "WEBP"
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
      && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    return 'image/webp';
  }

  return null;
}
