/* ==========================================================================
   /api/admin/settings
     GET — every setting with its default
     PUT — update one or more
   ========================================================================== */

import { json, readJson, handleError, corsHeaders, badRequest, str } from '../../_lib/http.js';
import { requireAdmin, recordAudit } from '../../_lib/auth.js';
import { getSettings, setSetting, DEFAULT_SETTINGS } from '../../_lib/db.js';

/** Bounds and types, so a typo in the panel cannot break the public site. */
const SCHEMA = {
  site_name:         { type: 'string', max: 60 },
  contact_email:     { type: 'string', max: 160 },
  auto_approve:      { type: 'bool' },
  auto_moderation:   { type: 'bool' },
  auto_reject:       { type: 'bool' },
  posting_enabled:   { type: 'bool' },
  listings_per_page: { type: 'int', min: 4, max: 48 },
  post_limit:        { type: 'int', min: 1, max: 100 },
  signup_limit:      { type: 'int', min: 1, max: 200 },
  promote_price:     { type: 'int', min: 0, max: 100000 },
  promote_days:      { type: 'int', min: 1, max: 365 },
};

export async function onRequestGet({ request, env }) {
  try {
    await requireAdmin(env, request);
    const settings = await getSettings(env);
    return json({ settings, defaults: DEFAULT_SETTINGS, schema: SCHEMA });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestPut({ request, env }) {
  try {
    const admin = await requireAdmin(env, request, ['admin']);
    const body = await readJson(request, 8 * 1024);

    const updates = [];
    const errors = {};

    for (const [key, raw] of Object.entries(body)) {
      const spec = SCHEMA[key];
      if (!spec) { errors[key] = 'Unknown setting.'; continue; }

      let value;
      if (spec.type === 'bool') {
        value = (raw === true || raw === 1 || raw === '1') ? '1' : '0';
      } else if (spec.type === 'int') {
        const n = Number.parseInt(String(raw), 10);
        if (Number.isNaN(n) || n < spec.min || n > spec.max) {
          errors[key] = `Must be a number between ${spec.min} and ${spec.max}.`;
          continue;
        }
        value = String(n);
      } else {
        const s = str(raw, spec.max);
        if (key === 'contact_email' && s && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) {
          errors[key] = 'That email looks wrong.';
          continue;
        }
        value = s;
      }
      updates.push([key, value]);
    }

    if (Object.keys(errors).length) throw badRequest('Some settings were invalid.', errors);

    for (const [key, value] of updates) await setSetting(env, key, value);

    await recordAudit(env, {
      actorId: admin.id, actorEmail: admin.email, action: 'settings.updated',
      detail: updates.map(([k, v]) => `${k}=${v}`).join(', ').slice(0, 300),
    });

    return json({ settings: await getSettings(env) });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
