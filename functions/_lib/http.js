/* ==========================================================================
   PetBikroy — HTTP helpers for Pages Functions
   ========================================================================== */

/** An error that carries an HTTP status, thrown anywhere and caught centrally. */
export class HttpError extends Error {
  constructor(message, status = 400, details = undefined) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (msg, details) => new HttpError(msg, 400, details);
export const unauthorized = (msg = 'Not signed in') => new HttpError(msg, 401);
export const forbidden = (msg = 'Not allowed') => new HttpError(msg, 403);
export const notFound = (msg = 'Not found') => new HttpError(msg, 404);
export const conflict = (msg) => new HttpError(msg, 409);
export const tooMany = (msg = 'Too many requests — please slow down') => new HttpError(msg, 429);

/** Standard JSON success envelope. */
export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': init.cache ?? 'no-store',
      // The API is plumbing, not content. Ad detail responses carry a seller's
      // phone number, so keep crawlers out of JSON entirely.
      'x-robots-tag': 'noindex',
      ...(init.headers || {}),
    },
  });
}

/** Standard JSON error envelope. */
export function jsonError(message, status = 400, details = undefined, headers = {}) {
  const body = { error: message };
  if (details !== undefined) body.details = details;
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-robots-tag': 'noindex',
      ...headers,
    },
  });
}

/** Parses a JSON body, rejecting anything oversized or malformed. */
export async function readJson(request, maxBytes = 32 * 1024) {
  const type = request.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    throw badRequest('Expected a JSON body');
  }
  const raw = await request.text();
  if (raw.length > maxBytes) {
    throw new HttpError('Request body is too large', 413);
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw badRequest('Expected a JSON object');
    }
    return parsed;
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw badRequest('Body is not valid JSON');
  }
}

/* ------------------------------------------------------------------ CORS */

/**
 * Cross-origin access is opt-in. Same-origin (the normal case, since the
 * admin panel ships inside the same Pages project) needs no CORS at all.
 * Set ALLOWED_ORIGINS to a comma-separated list to open it up for a
 * separately hosted front end.
 */
export function corsHeaders(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return {};
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (!allowed.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

/* ---------------------------------------------------------------- inputs */

/** Clamps a query-string integer. */export function intParam(value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = null } = {}) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Trims and hard-limits a string field. */
export function str(value, max = 200) {
  if (value === null || value === undefined) return '';
  return String(value).trim().slice(0, max);
}

/** Parses a comma-separated query parameter into a clean array. */
export function csv(value, max = 25) {
  if (!value) return [];
  return String(value).split(',')
    .map(s => s.trim()).filter(Boolean).slice(0, max);
}

export const bool = v => v === true || v === 1 || v === '1' || v === 'true';

/** The client IP, used only for rate limiting and session records. */
export const clientIp = request =>
  request.headers.get('cf-connecting-ip')
  || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  || '0.0.0.0';

/** A short, collision-resistant id. */
export function newId(prefix = '') {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return prefix + hex;
}

export const nowIso = () => new Date().toISOString();

/* ----------------------------------------------------------- error handler */

/**
 * Turns any thrown value into a JSON error response.
 * Unexpected errors log the stack but never leak it to the client.
 */
export function handleError(e, request, env) {
  const cors = corsHeaders(request, env);
  if (e instanceof HttpError) {
    return jsonError(e.message, e.status, e.details, cors);
  }
  // A D1 failure on a fresh database is common enough to deserve a clear hint.
  console.error('Unhandled API error:', e?.stack || e);
  return jsonError('Something went wrong on our side.', 500, undefined, cors);
}

/** Builds `{ok: true, errors: {}}` style helper used by the admin endpoints. */
export function ok(data = {}) {
  return json({ ok: true, ...data });
}
