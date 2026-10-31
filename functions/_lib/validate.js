/* ==========================================================================
   PetBikroy — server-side ad validation
   The authoritative copy of the rules. `assets/js/wizard.js` mirrors these
   for instant client feedback, but nothing is trusted until it passes here.
   ========================================================================== */

import { badRequest, str } from './http.js';

export const LIMITS = {
  TITLE_MIN: 10, TITLE_MAX: 140,
  DESC_MIN: 30, DESC_MAX: 5000,
  PRICE_MAX: 100_000_000,
  NAME_MIN: 2, NAME_MAX: 80,
  AGE_MAX: 40,
  MAX_PHOTOS: 6,
  PASSWORD_MIN: 8, PASSWORD_MAX: 100,
  BIO_MAX: 300,
  KINDS: ['sale', 'adoption', 'service'],
  GENDERS: ['', 'Male', 'Female', 'Pair'],
  CONDITIONS: ['New', 'Used', 'Refurbished'],
};

export const PHONE_RE = /^01[3-9]\d{8}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Strips everything that is not a digit. */
export const digits = v => String(v ?? '').replace(/\D/g, '');

/**
 * True for an R2 key this app could have issued.
 *
 * Photo URLs are `/img/` plus the key, and both look harmless to a naive
 * character check — so a URL sent back as a key would store the prefix inside
 * the key and the gallery would return `/img/img/…` afterwards. Refusing it
 * makes that mistake a 400 instead of silent corruption.
 */
const isPhotoKey = p => /^[A-Za-z0-9._/-]+$/.test(p)
  && !p.includes('..')
  && !p.replace(/^\/+/, '').startsWith('img/');

/**
 * Validates and normalises an incoming ad payload.
 *
 * @param {object} body      raw request body
 * @param {object} taxonomy  { categories: Set, subsByCat: Map, locations: Set, areasByLoc: Map }
 * @returns {{ad: object, errors: object}}
 */
export function validateAd(body, taxonomy) {
  const errors = {};
  const fail = (field, message) => { errors[field] = message; };

  /* ---- category ---- */
  const categoryId = str(body.categoryId, 40);
  if (!categoryId) fail('categoryId', 'Choose a category.');
  else if (!taxonomy.categories.has(categoryId)) fail('categoryId', 'Unknown category.');

  const subcategory = str(body.subcategory, 60);
  if (!categoryId || !errors.categoryId) {
    const allowed = taxonomy.subsByCat.get(categoryId);
    if (!subcategory) fail('subcategory', 'Choose a breed or type.');
    else if (!allowed || !allowed.has(subcategory)) {
      fail('subcategory', 'That breed does not belong to the chosen category.');
    }
  }

  /* ---- kind ---- */
  const kind = LIMITS.KINDS.includes(body.kind) ? body.kind : 'sale';

  /* ---- title ---- */
  const title = str(body.title, LIMITS.TITLE_MAX + 1);
  if (title.length < LIMITS.TITLE_MIN) {
    fail('title', `Title must be at least ${LIMITS.TITLE_MIN} characters.`);
  } else if (title.length > LIMITS.TITLE_MAX) {
    fail('title', `Title must be under ${LIMITS.TITLE_MAX} characters.`);
  }

  /* ---- description ---- */
  const description = str(body.description, LIMITS.DESC_MAX + 1);
  if (description.length < LIMITS.DESC_MIN) {
    fail('description', `Description must be at least ${LIMITS.DESC_MIN} characters.`);
  } else if (description.length > LIMITS.DESC_MAX) {
    fail('description', `Description must be under ${LIMITS.DESC_MAX} characters.`);
  }

  /* ---- price ---- */
  let price = 0;
  if (kind === 'adoption') {
    price = 0;                       // adoptions are always free
  } else {
    const raw = body.price;
    if (raw === null || raw === undefined || raw === '') {
      fail('price', 'Enter a price.');
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) fail('price', 'Price must be a positive number.');
      else if (n > LIMITS.PRICE_MAX) fail('price', 'Price is unrealistically high.');
      else price = Math.round(n);
    }
  }
  const negotiable = body.negotiable === true || body.negotiable === 1 || body.negotiable === '1';

  /* ---- location ---- */
  const locationId = str(body.locationId, 40);
  if (!locationId) fail('locationId', 'Choose a division.');
  else if (!taxonomy.locations.has(locationId)) fail('locationId', 'Unknown division.');

  const area = str(body.area, 60);
  if (!locationId || !errors.locationId) {
    const allowed = taxonomy.areasByLoc.get(locationId);
    if (!area) fail('area', 'Choose an area.');
    else if (!allowed || !allowed.has(area)) fail('area', 'That area is not in the chosen division.');
  }

  /* ---- animal specifics ---- */
  const age = str(body.age, LIMITS.AGE_MAX + 1);
  if (age.length > LIMITS.AGE_MAX) fail('age', 'Age is too long.');

  const gender = str(body.gender, 10);
  if (!LIMITS.GENDERS.includes(gender)) fail('gender', 'Unexpected gender value.');

  const condition = LIMITS.CONDITIONS.includes(body.condition) ? body.condition : 'New';
  const vaccinated = body.vaccinated === true || body.vaccinated === 1 || body.vaccinated === '1';

  /* ---- contact ---- */
  const contactName = str(body.contactName, LIMITS.NAME_MAX + 1);
  if (contactName.length < LIMITS.NAME_MIN) fail('contactName', 'Enter your name.');
  else if (contactName.length > LIMITS.NAME_MAX) fail('contactName', 'Name is too long.');

  const contactPhone = digits(body.contactPhone);
  if (!PHONE_RE.test(contactPhone)) {
    fail('contactPhone', 'Enter a valid Bangladeshi mobile number, e.g. 01712345678.');
  }

  const contactEmail = str(body.contactEmail, 160).toLowerCase();
  if (contactEmail && !EMAIL_RE.test(contactEmail)) fail('contactEmail', 'That email looks wrong.');

  /* ---- photos ---- */
  let photos = [];
  if (body.photos !== undefined) {
    if (!Array.isArray(body.photos)) fail('photos', 'Photos must be a list.');
    else if (body.photos.length > LIMITS.MAX_PHOTOS) {
      fail('photos', `A maximum of ${LIMITS.MAX_PHOTOS} photos is allowed.`);
    } else {
      photos = body.photos
        .map(p => str(p, 300))
        // Only accept keys this deployment issued, so nobody can point an ad
        // at an arbitrary URL.
        .filter(isPhotoKey);
      if (photos.length !== body.photos.length) fail('photos', 'One or more photos are invalid.');
    }
  }

  return {
    ad: {
      categoryId, subcategory, kind, title, description, price, negotiable,
      locationId, area, age, gender, condition, vaccinated,
      contactName, contactPhone, contactEmail, photos,
    },
    errors,
  };
}

/** Throws a 400 carrying per-field messages when validation failed. */
export function assertValid(result, key = 'ad') {
  const keys = Object.keys(result.errors);
  if (keys.length) {
    throw badRequest('Please fix the highlighted fields.', result.errors);
  }
  return result[key];
}

/* --------------------------------------------------------- member accounts */

/**
 * Validates a sign-up payload.
 *
 * The phone number is the login identifier *and* what a buyer rings, so it is
 * required and has to be a real Bangladeshi mobile number. Email is optional.
 *
 * @param {object} body
 * @param {object} [taxonomy]  when supplied, the division/area are checked too
 * @returns {{account: object, errors: object}}
 */
export function validateRegistration(body, taxonomy = null) {
  const errors = {};
  const fail = (field, message) => { errors[field] = message; };

  const name = str(body.name, LIMITS.NAME_MAX + 1);
  if (name.length < LIMITS.NAME_MIN) fail('name', 'Enter your name.');
  else if (name.length > LIMITS.NAME_MAX) fail('name', `Name must be under ${LIMITS.NAME_MAX} characters.`);

  const phone = digits(body.phone);
  if (!PHONE_RE.test(phone)) {
    fail('phone', 'Enter a valid Bangladeshi mobile number, e.g. 01712345678.');
  }

  const email = str(body.email, 160).toLowerCase();
  if (email && !EMAIL_RE.test(email)) fail('email', 'That email looks wrong.');

  const password = String(body.password ?? '');
  if (password.length < LIMITS.PASSWORD_MIN) {
    fail('password', `Use at least ${LIMITS.PASSWORD_MIN} characters.`);
  } else if (password.length > LIMITS.PASSWORD_MAX) {
    fail('password', `Password must be under ${LIMITS.PASSWORD_MAX} characters.`);
  }

  // Only checked when the client sends it, so the API stays usable without it.
  if (body.confirm !== undefined && body.confirm !== password) {
    fail('confirm', 'The two passwords do not match.');
  }

  const locationId = str(body.locationId, 40);
  const area = str(body.area, 60);
  checkLocation({ locationId, area, taxonomy, fail });

  return { account: { name, phone, email, password, locationId, area }, errors };
}

/** Validates a profile edit. */
export function validateProfile(body, taxonomy = null) {
  const errors = {};
  const fail = (field, message) => { errors[field] = message; };

  const name = str(body.name, LIMITS.NAME_MAX + 1);
  if (name.length < LIMITS.NAME_MIN) fail('name', 'Enter your name.');
  else if (name.length > LIMITS.NAME_MAX) fail('name', `Name must be under ${LIMITS.NAME_MAX} characters.`);

  const email = str(body.email, 160).toLowerCase();
  if (email && !EMAIL_RE.test(email)) fail('email', 'That email looks wrong.');

  const bio = str(body.bio, LIMITS.BIO_MAX + 1);
  if (bio.length > LIMITS.BIO_MAX) {
    fail('bio', `Keep your introduction under ${LIMITS.BIO_MAX} characters.`);
  }

  const locationId = str(body.locationId, 40);
  const area = str(body.area, 60);
  checkLocation({ locationId, area, taxonomy, fail });

  return { profile: { name, email, bio, locationId, area }, errors };
}

/** Validates a password change. */
export function validatePasswordChange(body) {
  const errors = {};
  const fail = (field, message) => { errors[field] = message; };

  const current = String(body.currentPassword ?? '');
  if (!current) fail('currentPassword', 'Enter your current password.');

  const next = String(body.newPassword ?? '');
  if (next.length < LIMITS.PASSWORD_MIN) {
    fail('newPassword', `Use at least ${LIMITS.PASSWORD_MIN} characters.`);
  } else if (next.length > LIMITS.PASSWORD_MAX) {
    fail('newPassword', `Password must be under ${LIMITS.PASSWORD_MAX} characters.`);
  } else if (next === current) {
    fail('newPassword', 'Choose a password different from your current one.');
  }

  return { passwords: { current, next }, errors };
}

/** Shared division/area check — both optional, but must be consistent. */
function checkLocation({ locationId, area, taxonomy, fail }) {
  if (!taxonomy || !locationId) return;
  if (!taxonomy.locations.has(locationId)) {
    fail('locationId', 'Unknown division.');
    return;
  }
  if (area) {
    const allowed = taxonomy.areasByLoc.get(locationId);
    if (allowed && !allowed.has(area)) {
      fail('area', 'That area is not in the chosen division.');
    }
  }
}
