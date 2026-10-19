/* ==========================================================================
   PetBikroy — authentication for the admin panel
   Password hashing (PBKDF2-SHA256), sessions in D1, httpOnly cookies.
   ========================================================================== */

import { HttpError, unauthorized, forbidden, newId, nowIso } from './http.js';

/**
 * PBKDF2 iteration count.
 *
 * This is the single knob to turn if logins fail with "exceeded CPU time".
 * Cloudflare's free plan gives a Pages Function only ~10ms of CPU, and
 * PBKDF2 cost is linear in the iteration count. 25k keeps a login around
 * 3-5ms of CPU while still being ~1000x harder to brute-force than a plain
 * SHA-256. Raise it on a paid plan; it is stored per-admin so existing
 * passwords keep verifying after you change it.
 */
export const PBKDF2_ITERATIONS = 25000;

const SESSION_COOKIE = 'pb_admin';
const SESSION_DAYS = 7;
const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_MINUTES = 15;

/* --------------------------------------------------------------- encoding */

const enc = new TextEncoder();

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

/** Constant-time string compare, so token checks do not leak via timing. */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function randomToken(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return toHex(buf);
}

/** SHA-256 hex digest — used for session tokens and owner tokens. */
export async function sha256Hex(value) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(String(value)));
  return toHex(digest);
}

/* ------------------------------------------------------------- passwords */

async function derive(password, saltHex, iterations) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations, hash: 'SHA-256' },
    key, 256,
  );
  return toHex(bits);
}

/** @returns {{hash: string, salt: string, iterations: number}} */
export async function hashPassword(password, iterations = PBKDF2_ITERATIONS) {
  const salt = randomToken(16);
  return { hash: await derive(password, salt, iterations), salt, iterations };
}

/**
 * Verifies a password against a stored admin row.
 * Always runs the KDF so a missing user and a wrong password cost the same.
 */
export async function verifyPassword(password, admin) {
  const iterations = Number(admin.iterations) || PBKDF2_ITERATIONS;
  const candidate = await derive(password, admin.password_salt, iterations);
  return safeEqual(candidate, admin.password_hash);
}

/* -------------------------------------------------------------- cookies */

export function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function sessionCookie(token, maxAgeSeconds = SESSION_DAYS * 86400) {
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
  ].join('; ');
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/* -------------------------------------------------------------- sessions */

export async function createSession(env, adminId, request) {
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const created = new Date();
  const expires = new Date(created.getTime() + SESSION_DAYS * 86400_000);

  await env.DB.prepare(
    `INSERT INTO sessions (token_hash, admin_id, created_at, expires_at, user_agent, ip)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(
    tokenHash, adminId, created.toISOString(), expires.toISOString(),
    (request.headers.get('user-agent') || '').slice(0, 200),
    request.headers.get('cf-connecting-ip') || '',
  ).run();

  return token;
}

/** Resolves the signed-in admin from the request cookie, or null. */
export async function getSession(env, request) {
  const token = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE];
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT s.token_hash, s.expires_at,
            a.id, a.email, a.name, a.role, a.is_active
       FROM sessions s
       JOIN admins a ON a.id = s.admin_id
      WHERE s.token_hash = ?`,
  ).bind(tokenHash).first();

  if (!row) return null;

  // Expired or deactivated — clean up and treat as signed out.
  if (new Date(row.expires_at).getTime() < Date.now() || !row.is_active) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    return null;
  }

  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

export async function destroySession(env, request) {
  const token = parseCookies(request.headers.get('cookie'))[SESSION_COOKIE];
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

/** Deletes expired sessions. Cheap enough to run opportunistically. */
export async function sweepSessions(env) {
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?')
    .bind(nowIso()).run();
}

/**
 * Asserts the request carries a valid admin session.
 * @returns the admin record
 */
export async function requireAdmin(env, request, roles = null) {
  const admin = await getSession(env, request);
  if (!admin) throw unauthorized('Sign in to continue');
  if (roles && !roles.includes(admin.role)) {
    throw forbidden('Your role does not allow this action');
  }
  return admin;
}

/* ---------------------------------------------------------------- login */

/**
 * Login throttle: counts failures per IP *and* per email so neither a single
 * address nor a single account can be hammered.
 */
async function tooManyFailures(env, email, ip) {
  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60_000).toISOString();
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM audit_log
      WHERE action = 'login.failed'
        AND created_at > ?
        AND (detail = ? OR target_id = ?)`,
  ).bind(since, email, ip).first();
  return (row?.n || 0) >= MAX_FAILED_ATTEMPTS;
}

export async function recordAudit(env, { actorId = null, actorEmail = '', action, targetType = '', targetId = '', detail = '' }) {
  await env.DB.prepare(
    `INSERT INTO audit_log (actor_id, actor_email, action, target_type, target_id, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(actorId, actorEmail, action, targetType, targetId, detail, nowIso()).run();
}

/**
 * Verifies credentials and opens a session.
 * @returns {{token: string, admin: object}}
 */
export async function login(env, request, email, password) {
  const ip = request.headers.get('cf-connecting-ip') || '';
  const normalised = String(email || '').trim().toLowerCase();

  if (await tooManyFailures(env, normalised, ip)) {
    throw new HttpError(
      `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`, 429,
    );
  }

  const admin = await env.DB.prepare(
    'SELECT * FROM admins WHERE email = ?',
  ).bind(normalised).first();

  // Hash even when the account is missing, to keep response times uniform.
  const ok = admin
    ? await verifyPassword(password, admin)
    : await verifyPassword(password, {
        password_hash: '00'.repeat(32), password_salt: '00'.repeat(16),
        iterations: PBKDF2_ITERATIONS,
      });

  if (!admin || !ok || !admin.is_active) {
    await recordAudit(env, {
      action: 'login.failed', targetId: ip, detail: normalised,
    });
    throw unauthorized('Incorrect email or password');
  }

  // Clear stale lockout counters on success.
  await env.DB.prepare(
    'UPDATE admins SET failed_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?',
  ).bind(nowIso(), admin.id).run();

  await sweepSessions(env);
  const token = await createSession(env, admin.id, request);

  await recordAudit(env, {
    actorId: admin.id, actorEmail: admin.email, action: 'login.success',
  });

  return {
    token,
    admin: {
      id: admin.id, email: admin.email, name: admin.name, role: admin.role,
    },
  };
}

/* ------------------------------------------------------ owner ad tokens */

/**
 * Ads are owned by a secret token rather than an account, so anyone can post
 * without signing up while still being the only one who can edit or delete
 * their own listing.
 */
export function newOwnerToken() {
  return randomToken(24);
}

export async function ownerTokenMatches(token, storedHash) {
  if (!token || !storedHash) return false;
  return safeEqual(await sha256Hex(token), storedHash);
}

/** Generates a memorable but strong password for bootstrapping. */
export function suggestPassword() {
  const words = ['otter', 'maple', 'cobalt', 'harbor', 'falcon', 'cedar',
                 'quartz', 'lantern', 'meadow', 'puzzle', 'saffron', 'walnut'];
  const pick = () => words[Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] % words.length)];
  const digits = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
  return `${pick()}-${pick()}-${String(digits).padStart(4, '0')}`;
}

export { newId };
