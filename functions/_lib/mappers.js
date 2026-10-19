/* ==========================================================================
   PetBikroy — row <-> API shape
   The API returns ads in the same shape the front end already understands,
   so the browser code needs almost no translation.
   ========================================================================== */

/** SQL selected for a public ad row. */
export const AD_COLUMNS = `
  a.id, a.category_id, a.subcategory, a.title, a.description, a.price,
  a.negotiable, a.kind, a.location_id, a.area, a.age, a.gender, a.vaccinated,
  a.condition, a.status, a.featured, a.views, a.contact_name, a.contact_phone,
  a.created_at, a.updated_at, a.published_at`;

/**
 * Maps a DB row (plus its photos) to the JSON the front end consumes.
 * @param {object} row
 * @param {string[]} photos  public image URLs, cover first
 */
export function toPublicAd(row, photos = []) {
  return {
    id: row.id,
    cat: row.category_id,
    sub: row.subcategory,
    title: row.title,
    price: row.price,
    negotiable: !!row.negotiable,
    kind: row.kind,
    loc: row.location_id,
    area: row.area,
    age: row.age || '',
    gender: row.gender || '',
    vaccinated: !!row.vaccinated,
    condition: row.condition,
    status: row.status,
    featured: !!row.featured,
    views: row.views || 0,
    created: row.published_at || row.created_at,
    photos,
    desc: row.description,
    seller: {
      name: row.contact_name,
      joined: row.created_at,
      verified: false,
      ads: 1,
    },
  };
}

/**
 * Detail shape: everything in `toPublicAd` plus the seller's contact details.
 *
 * The phone number is deliberately absent from *listing* responses. A buyer
 * needs it on the ad page, but shipping it with every search result would turn
 * the whole catalogue into a phone-book in one request.
 */
export function toPublicAdDetail(row, photos = [], { canManage = false } = {}) {
  return {
    ...toPublicAd(row, photos),
    phone: row.contact_phone,
    email: row.contact_email || '',
    canManage,
  };
}

/** Admin view: everything above plus private contact and moderation fields. */
export function toAdminAd(row, photos = []) {
  return {
    ...toPublicAd(row, photos),
    phone: row.contact_phone,
    email: row.contact_email || '',
    rejectionReason: row.rejection_reason || '',
    updated: row.updated_at,
    photoCount: photos.length,
  };
}

/** R2 object key -> the URL the browser should request. */
export const photoUrl = key => `/img/${key}`;
