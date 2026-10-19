/* ==========================================================================
   /api/ads/:id
     GET    — public ad detail
     PUT    — update my ad (needs the owner token, or an admin session)
     DELETE — remove my ad (needs the owner token, or an admin session)

   Ownership without accounts: POST /api/ads returns a one-time `ownerToken`;
   the browser stores it and sends it back in `x-owner-token` to prove
   ownership. Only its SHA-256 lives in the database.
   ========================================================================== */

import {
  json, readJson, handleError, notFound, forbidden, unauthorized,
  corsHeaders, nowIso, HttpError, clientIp,
} from '../../_lib/http.js';
import { loadTaxonomy, getSettings, isOn, rateLimit } from '../../_lib/db.js';
import { validateAd, assertValid } from '../../_lib/validate.js';
import { fetchPhotos, setPhotos, fetchPhotoMap } from '../../_lib/ads.js';
import { toPublicAd, toPublicAdDetail } from '../../_lib/mappers.js';
import { getSession, ownerTokenMatches, recordAudit } from '../../_lib/auth.js';

/** Loads the ad plus whatever authority the caller has over it. */
async function loadAdWithAccess(env, request, id) {
  const row = await env.DB.prepare('SELECT * FROM ads WHERE id = ?').bind(id).first();
  if (!row) throw notFound('That ad does not exist.');

  const admin = await getSession(env, request);
  if (admin) return { row, admin, owner: true };

  const token = request.headers.get('x-owner-token') || '';
  const owner = await ownerTokenMatches(token, row.owner_token_hash);
  return { row, admin: null, owner };
}

export async function onRequestGet({ request, env, params }) {
  try {
    const row = await env.DB.prepare('SELECT * FROM ads WHERE id = ?')
      .bind(params.id).first();
    if (!row) throw notFound('That ad does not exist.');

    const admin = await getSession(env, request);
    const token = request.headers.get('x-owner-token') || '';
    const owner = await ownerTokenMatches(token, row.owner_token_hash);
    const canManage = Boolean(admin || owner);

    // Draft or rejected ads are visible only to their owner or an admin.
    if (row.status !== 'active' && row.status !== 'sold' && !canManage) {
      throw notFound('That ad does not exist.');
    }

    const photos = await fetchPhotos(env, row.id);
    return json({
      ad: toPublicAdDetail(row, photos, { canManage }),
      rejectionReason: canManage ? (row.rejection_reason || '') : '',
    }, {
      // Never cacheable: the body depends on who is asking. `canManage` and
      // the rejection note are decided per caller, and a shared cache could
      // otherwise hand an owner's response to a stranger — which would put
      // "Delete ad" buttons in front of someone who does not own the listing.
      cache: 'no-store',
    });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestPut({ request, env, params }) {
  try {
    const { row, admin, owner } = await loadAdWithAccess(env, request, params.id);

    if (!admin && !owner) {
      throw admin === null && !owner
        ? unauthorized('Only the person who posted this ad can edit it.')
        : forbidden();
    }

    await rateLimit(env, `edit:${clientIp(request)}`, 30, 3600);

    const body = await readJson(request, 48 * 1024);
    const taxonomy = await loadTaxonomy(env);
    const ad = assertValid(validateAd(body, taxonomy));

    // Status is not part of the ad payload, so it is decided here.
    //   * an admin may move an ad to any real status;
    //   * an owner may only mark their ad sold, or put it back up for sale —
    //     they cannot approve their own rejected ad;
    //   * editing a rejected ad sends it back to the review queue, which is
    //     the only way a seller gets a second look.
    const ALL_STATUSES = new Set(['active', 'pending', 'sold', 'rejected']);
    const OWNER_STATUSES = new Set(['active', 'sold']);

    let status = row.status;
    if (admin) {
      if (typeof body.status === 'string' && ALL_STATUSES.has(body.status)) {
        status = body.status;
      }
    } else if (typeof body.status === 'string' && OWNER_STATUSES.has(body.status)) {
      status = row.status === 'rejected' ? 'pending' : body.status;
    } else if (row.status === 'rejected') {
      status = 'pending';
    }

    await env.DB.prepare(
      `UPDATE ads SET
         category_id = ?, subcategory = ?, title = ?, description = ?, price = ?,
         negotiable = ?, kind = ?, location_id = ?, area = ?, age = ?, gender = ?,
         vaccinated = ?, condition = ?, contact_name = ?, contact_phone = ?,
         contact_email = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    ).bind(
      ad.categoryId, ad.subcategory, ad.title, ad.description, ad.price,
      ad.negotiable ? 1 : 0, ad.kind, ad.locationId, ad.area, ad.age, ad.gender,
      ad.vaccinated ? 1 : 0, ad.condition, ad.contactName, ad.contactPhone,
      ad.contactEmail, status, nowIso(), params.id,
    ).run();

    // Only replace photos when the client actually sent a new list, so a
    // partial edit cannot silently wipe them.
    if (Array.isArray(body.photos)) {
      await setPhotos(env, params.id, ad.photos);
    }

    await recordAudit(env, {
      actorId: admin?.id ?? null,
      actorEmail: admin?.email ?? 'owner',
      action: admin ? 'ad.updated.admin' : 'ad.updated.owner',
      targetType: 'ad', targetId: params.id,
      detail: status !== row.status ? `${ad.title} -> ${status}` : ad.title,
    });

    const updated = await env.DB.prepare('SELECT * FROM ads WHERE id = ?')
      .bind(params.id).first();
    const photos = await fetchPhotos(env, params.id);

    return json({
      ad: toPublicAdDetail(updated, photos, { canManage: true }),
      rejectionReason: row.rejection_reason || '',
    });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    const { row, admin, owner } = await loadAdWithAccess(env, request, params.id);
    if (!admin && !owner) {
      throw unauthorized('Only the person who posted this ad can delete it.');
    }

    // Clean up the R2 objects before dropping the rows that reference them.
    const keys = await env.DB.prepare('SELECT r2_key FROM ad_photos WHERE ad_id = ?')
      .bind(params.id).all();
    const objects = (keys.results ?? []).map(k => k.r2_key);

    await env.DB.prepare('DELETE FROM ads WHERE id = ?').bind(params.id).run();

    if (objects.length && env.IMAGES) {
      try { await env.IMAGES.delete(objects); }
      catch (err) { console.error('R2 cleanup failed', err); }
    }

    await recordAudit(env, {
      actorId: admin?.id ?? null,
      actorEmail: admin?.email ?? 'owner',
      action: admin ? 'ad.deleted.admin' : 'ad.deleted.owner',
      targetType: 'ad', targetId: params.id, detail: row.title,
    });

    return json({ ok: true });
  } catch (e) {
    return handleError(e, request, env);
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}
