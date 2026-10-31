/* ==========================================================================
   PetBikroy — authentication for members and staff

   Password hashing (PBKDF2-SHA256), sessions in D1, httpOnly cookies.

   Two kinds of principal sign in here, and they are deliberately kept apart:

     members (users)  — sign in with a phone number, post and manage listings
     staff   (admins) — sign in with an email, moderate everything

   They use separate cookies and separate tables, so signing into the admin
   panel does not sign you out of the site as a member, and a member account
   can never be mistaken for staff by a bug in a role check.
   ========================================================================== */

import { HttpError, unauthorized, forbidden, conflict, newId, nowIso } from './http.js';

/**
 * PBKDF2 iteration count.
 *
 * This is the single knob to turn if logins fail with "exceeded CPU time".
 * Cloudflare's free plan gives a Pages Function only ~10ms of CPU, and
 * PBKDF2 cost is linear in the iteration count. 25k keeps a login around
 * 3-5ms of CPU while still being ~1000x harder to brute-force than a plain
 * SHA-256. Raise it on a paid plan; it is stored per account so existing
 * passwords keep verifying after you change it.
 */
export const PBKDF2_ITERATIONS = 25000;

const ADMIN_COOKIE = 'pb_admin';
const USER_COOKIE = 'pb_user';

const ADMIN_SESSION_DAYS = 7;
const USER_SESSION_DAYS = 30;   // members stay signed in; nothing sensitive lives here

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

/** SHA-256 hex digest — used for session tokens. */
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
 * Verifies a password against a stored account row.
 * Always runs the KDF so a missing account and a wrong password cost the same.
 */
export async function verifyPassword(password, account) {
  const iterations = Number(account.iterations) || PBKDF2_ITERATIONS;
  const candidate = await derive(password, account.password_salt, iterations);
  return safeEqual(candidate, account.password_hash);
}

/**
 * Runs the KDF against a stand-in row when the account does not exist, so the
 * response time does not reveal whether a phone number is registered.
 */
function verifyOrBurn(password, account) {
  return verifyPassword(password, account || {
    password_hash: '00'.repeat(32),
    password_salt: '00'.repeat(16),
    iterations: PBKDF2_ITERATIONS,
  });
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

const cookieName = kind => (kind === 'admin' ? ADMIN_COOKIE : USER_COOKIE);

export function sessionCookie(token, kind = 'admin') {
  const days = kind === 'admin' ? ADMIN_SESSION_DAYS : USER_SESSION_DAYS;
  return [
    `${cookieName(kind)}=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${days * 86400}`,
  ].join('; ');
}

export function clearSessionCookie(kind = 'admin') {
  return `${cookieName(kind)}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

/* -------------------------------------------------------------- sessions */

export async function createSession(env, kind, principalId, request) {
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const created = new Date();
  const days = kind === 'admin' ? ADMIN_SESSION_DAYS : USER_SESSION_DAYS;
  const expires = new Date(created.getTime() + days * 86400_000);

  await env.DB.prepare(
    `INSERT INTO sessions (token_hash, kind, admin_id, user_id, created_at, expires_at, user_agent, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    tokenHash, kind,
    kind === 'admin' ? principalId : null,
    kind === 'user' ? principalId : null,
    created.toISOString(), expires.toISOString(),
    (request.headers.get('user-agent') || '').slice(0, 200),
    request.headers.get('cf-connecting-ip') || '',
  ).run();

  return token;
}

/** Resolves the signed-in staff member from the request cookie, or null. */
export async function getAdminSession(env, request) {
  const token = parseCookies(request.headers.get('cookie'))[ADMIN_COOKIE];
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT s.expires_at, a.id, a.email, a.name, a.role, a.is_active
       FROM sessions s
       JOIN admins a ON a.id = s.admin_id
      WHERE s.token_hash = ? AND s.kind = 'admin'`,
  ).bind(tokenHash).first();

  if (!row) return null;

  // Expired or deactivated — clean up and treat as signed out.
  if (new Date(row.expires_at).getTime() < Date.now() || !row.is_active) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    return null;
  }

  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

/** Resolves the signed-in member from the request cookie, or null. */
export async function getUserSession(env, request) {
  const token = parseCookies(request.headers.get('cookie'))[USER_COOKIE];
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT s.expires_at,
            u.id, u.phone, u.name, u.email, u.area, u.location_id,
            u.verified, u.is_active, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.kind = 'user'`,
  ).bind(tokenHash).first();

  if (!row) return null;

  if (new Date(row.expires_at).getTime() < Date.now() || !row.is_active) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
    return null;
  }

  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    email: row.email,
    area: row.area,
    loc: row.location_id,
    verified: !!row.verified,
    joined: row.created_at,
  };
}

export async function destroySession(env, request, kind = 'admin') {
  const token = parseCookies(request.headers.get('cookie'))[cookieName(kind)];
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

/** Deletes expired sessions. Cheap enough to run opportunistically. */
export async function sweepSessions(env) {
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?')
    .bind(nowIso()).run();
}

/* ------------------------------------------------------------- principals */

/**
 * Asserts the request carries a valid staff session.
 * @returns the admin record
 */
export async function requireAdmin(env, request, roles = null) {
  const admin = await getAdminSession(env, request);
  if (!admin) throw unauthorized('Sign in to continue');
  if (roles && !roles.includes(admin.role)) {
    throw forbidden('Your role does not allow this action');
  }
  return admin;
}

/**
 * Asserts the request carries a valid member session.
 * @returns the user record
 */
export async function requireUser(env, request) {
  const user = await getUserSession(env, request);
  if (!user) {
    throw unauthorized('Sign in to your PetBikroy account to continue');
  }
  return user;
}

/* ---------------------------------------------------------------- logins */

/**
 * Login throttle: counts failures per IP *and* per identifier so neither a
 * single address nor a single account can be hammered.
 */
async function tooManyFailures(env, identifier, ip, prefix) {
  const since = new Date(Date.now() - LOCKOUT_MINUTES * 60_000).toISOString();

  // The IP half of the check is skipped when no address is available, rather
  // than compared against an empty string — which would drop every visitor
  // without the header into one shared bucket.
  const ipClause = ip ? ' OR target_id = ?' : '';
  const sql = `SELECT COUNT(*) AS n FROM audit_log
                WHERE action = ?
                  AND created_at > ?
                  AND (detail = ?${ipClause})`;
  const binds = ip
    ? [`${prefix}.login.failed`, since, identifier, ip]
    : [`${prefix}.login.failed`, since, identifier];

  const row = await env.DB.prepare(sql).bind(...binds).first();
  return (row?.n || 0) >= MAX_FAILED_ATTEMPTS;
}

export async function recordAudit(env, { actorId = null, actorEmail = '', action, targetType = '', targetId = '', detail = '' }) {
  await env.DB.prepare(
    `INSERT INTO audit_log (actor_id, actor_email, action, target_type, target_id, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(actorId, actorEmail, action, targetType, targetId, detail, nowIso()).run();
}

/**
 * Verifies staff credentials and opens an admin session.
 * @returns {{token: string, admin: object}}
 */
export async function loginAdmin(env, request, email, password) {
  const ip = request.headers.get('cf-connecting-ip') || '';
  const normalised = String(email || '').trim().toLowerCase();

  if (await tooManyFailures(env, normalised, ip, 'admin')) {
    throw new HttpError(
      `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`, 429,
    );
  }

  const admin = await env.DB.prepare(
    'SELECT * FROM admins WHERE email = ?',
  ).bind(normalised).first();

  const ok = await verifyOrBurn(password, admin);

  if (!admin || !ok || !admin.is_active) {
    await recordAudit(env, {
      action: 'admin.login.failed', targetId: ip, detail: normalised,
    });
    throw unauthorized('Incorrect email or password');
  }

  await env.DB.prepare(
    'UPDATE admins SET failed_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?',
  ).bind(nowIso(), admin.id).run();

  await sweepSessions(env);
  const token = await createSession(env, 'admin', admin.id, request);

  await recordAudit(env, {
    actorId: admin.id, actorEmail: admin.email, action: 'admin.login.success',
  });

  return {
    token,
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
  };
}

/**
 * Verifies member credentials and opens a user session.
 * Members sign in with the phone number they posted with.
 * @returns {{token: string, user: object}}
 */
export async function loginUser(env, request, phone, password) {
  const ip = request.headers.get('cf-connecting-ip') || '';
  const normalised = String(phone || '').replace(/\D/g, '');

  if (await tooManyFailures(env, normalised, ip, 'user')) {
    throw new HttpError(
      `Too many failed attempts. Try again in ${LOCKOUT_MINUTES} minutes.`, 429,
    );
  }

  const user = await env.DB.prepare(
    'SELECT * FROM users WHERE phone = ?',
  ).bind(normalised).first();

  const ok = await verifyOrBurn(password, user);

  if (!user || !ok || !user.is_active) {
    await recordAudit(env, {
      action: 'user.login.failed', targetId: ip, detail: normalised,
    });
    throw unauthorized('Incorrect phone number or password');
  }

  await env.DB.prepare(
    'UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = ? WHERE id = ?',
  ).bind(nowIso(), user.id).run();

  await sweepSessions(env);
  const token = await createSession(env, 'user', user.id, request);

  await recordAudit(env, {
    actorId: user.id, actorEmail: user.phone, action: 'user.login.success',
  });

  return { token, id: user.id };
}

/**
 * Creates a member account and signs them straight in.
 * @returns {{token: string, user: object}}
 */
export async function registerUser(env, request, profile) {
  const phone = String(profile.phone || '').replace(/\D/g, '');

  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE phone = ?',
  ).bind(phone).first();
  if (existing) {
    throw conflict('An account with that phone number already exists. Try signing in instead.');
  }

  const { hash, salt, iterations } = await hashPassword(profile.password);
  const id = newId('u-');
  const now = nowIso();

  await env.DB.prepare(
    `INSERT INTO users (
       id, phone, name, email, password_hash, password_salt, iterations,
       bio, location_id, area, verified, is_active, created_at, updated_at
     ) VALUES (?,?,?,?,?,?,?,'',?,?,0,1,?,?)`,
  ).bind(
    id, phone, profile.name, profile.email || '',
    hash, salt, iterations,
    profile.locationId || null, profile.area || '',
    now, now,
  ).run();

  await recordAudit(env, {
    actorId: id, actorEmail: phone, action: 'user.registered',
    targetType: 'user', targetId: id, detail: profile.name,
  });

  const token = await createSession(env, 'user', id, request);

  return { token, id };
}

/** Re-hashes and stores a new password for a member. */
export async function setUserPassword(env, userId, password) {
  const { hash, salt, iterations } = await hashPassword(password);
  await env.DB.prepare(
    `UPDATE users SET password_hash = ?, password_salt = ?, iterations = ?,
                      failed_attempts = 0, locked_until = NULL, updated_at = ?
      WHERE id = ?`,
  ).bind(hash, salt, iterations, nowIso(), userId).run();
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
