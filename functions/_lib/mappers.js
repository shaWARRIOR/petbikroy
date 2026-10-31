/* ==========================================================================
   PetBikroy — row <-> API shape
   The API returns ads in the same shape the front end already understands,
   so the browser code needs almost no translation.
   ========================================================================== */

/**
 * SQL selected for a public ad row.
 *
 * Every listing belongs to a member, so the poster's public profile rides
 * along in the same query. `AD_FROM` is the matching FROM clause — the two
 * must be used together.
 */
export const AD_COLUMNS = `
  a.id, a.user_id, a.category_id, a.subcategory, a.title, a.description, a.price,
  a.negotiable, a.kind, a.location_id, a.area, a.age, a.gender, a.vaccinated,
  a.condition, a.status, a.featured, a.views, a.contact_name, a.contact_phone,
  a.created_at, a.updated_at, a.published_at, a.rejection_reason,
  a.auto_decision,
  u.name       AS seller_name,
  u.verified   AS seller_verified,
  u.created_at AS seller_joined`;

export const AD_FROM = 'FROM ads a LEFT JOIN users u ON u.id = a.user_id';

/**
 * Maps a DB row (plus its photos) to the JSON the front end consumes.
 * @param {object} row
 * @param {string[]} photos  public image URLs, cover first
 * @param {{adCount?: number}} [extra]  the seller's live listing count, when known
 */
export function toPublicAd(row, photos = [], { adCount } = {}) {
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
    // The automated moderator's verdict, so "My ads" can tell a seller why an
    // ad is waiting, and so a non-active ad can show its reason inline. Buyers
    // never act on it, but it is harmless to carry.
    autoDecision: row.auto_decision || '',
    autoReason: row.auto_reason || '',
    rejectionReason: row.rejection_reason || '',
    desc: row.description,
    seller: {
      // `contact_name` is what the poster typed on this ad; the account name
      // is the fallback and the source of the verified badge.
      id: row.user_id || '',
      name: row.seller_name || row.contact_name,
      joined: row.seller_joined || row.created_at,
      verified: !!row.seller_verified,
      ...(adCount === undefined ? {} : { ads: adCount }),
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
export function toPublicAdDetail(row, photos = [], { canManage = false, isOwner = false } = {}) {
  return {
    ...toPublicAd(row, photos),
    phone: row.contact_phone,
    email: row.contact_email || '',
    // True when the caller may edit or delete: the signed-in owner, or staff.
    canManage,
    // True only when the caller is the member who posted this ad. An admin can
    // manage without owning it, and the public page must not treat a moderator
    // as the owner (it would show "This is your ad" on every ad).
    isOwner,
  };
}

/** Admin view: everything above plus private contact and moderation fields. */
export function toAdminAd(row, photos = []) {
  return {
    ...toPublicAd(row, photos),
    phone: row.contact_phone,
    email: row.contact_email || '',
    sellerId: row.user_id || '',
    rejectionReason: row.rejection_reason || '',
    autoDecision: row.auto_decision || '',
    autoReason: row.auto_reason || '',
    updated: row.updated_at,
    photoCount: photos.length,
  };
}

/* ------------------------------------------------------------------ users */

/** Columns for a member row. */
export const USER_COLUMNS = `
  u.id, u.phone, u.name, u.email, u.bio, u.location_id, u.area,
  u.verified, u.is_active, u.last_login_at, u.created_at`;

/*
 * The public seller profile. It deliberately omits the phone number and the
 * email: a buyer gets the number from an individual ad, not from a page that
 * lists every seller on the site.
 */
export function toPublicUser(row, { adCount = 0 } = {}) {
  return {
    id: row.id,
    name: row.name,
    loc: row.location_id || '',
    area: row.area || '',
    bio: row.bio || '',
    verified: !!row.verified,
    joined: row.created_at,
    ads: adCount,
  };
}

/** The signed-in member's own profile — includes what only they may see. */
export function toOwnUser(row, { adCount = 0 } = {}) {
  return {
    ...toPublicUser(row, { adCount }),
    phone: row.phone,
    email: row.email || '',
  };
}

/** Admin view of a member. */
export function toAdminUser(row, { adCount = 0, activeAds = 0 } = {}) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || '',
    loc: row.location_id || '',
    area: row.area || '',
    verified: !!row.verified,
    active: !!row.is_active,
    ads: adCount,
    activeAds,
    joined: row.created_at,
    lastLogin: row.last_login_at || '',
  };
}

/** R2 object key -> the URL the browser should request. */
export const photoUrl = key => `/img/${key}`;
