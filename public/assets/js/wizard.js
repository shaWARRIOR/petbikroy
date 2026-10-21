/* ==========================================================================
   PetBikroy — post-an-ad wizard logic
   Pure functions (no DOM) so the rules can be tested and reused.
   ========================================================================== */

const Wizard = (() => {
  'use strict';

  // ---------------------------------------------------------------------
  // Every limit below mirrors LIMITS in functions/_lib/validate.js. The
  // server is the authority; these copies exist only so the wizard can give
  // instant feedback. tests/validate.py fails the build if the two drift
  // apart, because a *stricter* browser limit silently rejects input the API
  // would have accepted — which is how a 2.5 MB photo cap once turned away
  // ordinary phone photos the server would gladly have stored.
  // ---------------------------------------------------------------------

  const MAX_PHOTOS = 6;
  const MAX_BYTES = 5 * 1024 * 1024;

  const TITLE_MIN = 10;
  const TITLE_MAX = 140;
  const DESC_MIN = 30;
  const DESC_MAX = 5000;
  const AGE_MAX = 40;

  const STEPS = [
    { n: 1, label: 'Category' },
    { n: 2, label: 'Details' },
    { n: 3, label: 'Location' },
    { n: 4, label: 'Review' },
  ];

  /** Categories that describe a living animal (so age/gender/health apply). */
  const NON_ANIMAL = ['accessories', 'food', 'services'];

  const isAnimalCategory = catId => !!catId && NON_ANIMAL.indexOf(catId) === -1;

  function blank() {
    return {
      cat: '', sub: '', kind: 'sale',
      title: '', photos: [], price: null, negotiable: true, desc: '',
      age: '', gender: '', condition: 'New', vaccinated: false,
      loc: '', area: '', name: '', phone: '', email: '',
    };
  }

  /* ----------------------------------------------------------- validation */

  const PHONE_RE = /^01[3-9]\d{8}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const digits = s => String(s || '').replace(/\D/g, '');

  /**
   * Validates one step.
   * @returns {{ok: boolean, errors: string[]}} errors are field ids
   *          matching the `#err-<id>` messages in post.html.
   */
  function validateStep(step, draft, ctx = {}) {
    const errors = [];
    const need = (cond, id) => { if (!cond) errors.push(id); };

    if (step === 1) {
      need(!!draft.cat, 'cat');
      if (draft.cat) need(!!draft.sub, 'sub');
    }

    if (step === 2) {
      need(String(draft.title || '').trim().length >= TITLE_MIN, 'title');
      if (draft.kind !== 'adoption') {
        const p = draft.price;
        need(p !== null && p !== '' && !Number.isNaN(Number(p)) && Number(p) >= 0, 'price');
      }
      need(String(draft.desc || '').trim().length >= DESC_MIN, 'desc');
    }

    if (step === 3) {
      need(!!draft.loc, 'loc');
      need(!!draft.area, 'area');
      need(String(draft.name || '').trim().length >= 2, 'name');
      need(PHONE_RE.test(digits(draft.phone)), 'phone');
      const email = String(draft.email || '').trim();
      if (email) need(EMAIL_RE.test(email), 'email');
    }

    if (step === 4) {
      need(ctx.terms === true, 'terms');
    }

    return { ok: errors.length === 0, errors };
  }

  /** Validates every step up to and including `upTo`. */
  function validateAll(draft, upTo = 4, ctx = {}) {
    const errors = [];
    for (let s = 1; s <= upTo; s++) errors.push(...validateStep(s, draft, ctx).errors);
    return { ok: errors.length === 0, errors };
  }

  /* -------------------------------------------------------------- mapping */

  function priceFor(draft) {
    return draft.kind === 'adoption' ? 0 : Math.max(0, Math.round(Number(draft.price) || 0));
  }

  /**
   * Turns a draft into a storable ad record.
   * @param {object} draft
   * @param {object} meta  { id, now, existingCount }
   */
  function buildAd(draft, meta = {}) {
    const now = meta.now || new Date().toISOString();
    return {
      id: meta.id || null,
      cat: draft.cat,
      sub: draft.sub,
      title: String(draft.title || '').trim(),
      price: priceFor(draft),
      negotiable: !!draft.negotiable,
      loc: draft.loc,
      area: draft.area,
      age: String(draft.age || '').trim(),
      gender: draft.gender || '',
      vaccinated: !!draft.vaccinated,
      condition: draft.condition || 'New',
      views: 0,
      featured: false,
      status: 'active',
      created: now,
      seller: {
        name: String(draft.name || '').trim(),
        joined: now,
        verified: false,
        ads: (meta.existingCount || 0) + 1,
      },
      phone: digits(draft.phone),
      email: String(draft.email || '').trim(),
      photos: Array.isArray(draft.photos) ? draft.photos.slice() : [],
      desc: String(draft.desc || '').trim(),
    };
  }

  /** How many more photos may be added. */
  function photoRoom(draft) {
    return Math.max(0, MAX_PHOTOS - (draft.photos || []).length);
  }

  /** True when the file can be accepted (type + size). */
  function photoAccepted(file) {
    return !!file && /^image\//.test(file.type || '') && (file.size || 0) <= MAX_BYTES;
  }

  /* ------------------------------------------------------- photo storage */

  /* The API hands out photo URLs but stores object keys: a URL is the key
     with this prefix, exactly as photoUrl() in functions/_lib/mappers.js
     builds it. Editing a listing sends the keys back, so the two directions
     live together here rather than being retyped in each page. */
  const PHOTO_PREFIX = '/img/';

  const photoSrc = key => PHOTO_PREFIX + key;

  /** The storage key behind a photo URL, or '' when it is not one of ours. */
  function photoKey(url) {
    return (typeof url === 'string' && url.indexOf(PHOTO_PREFIX) === 0)
      ? url.slice(PHOTO_PREFIX.length)
      : '';
  }

  return {
    MAX_PHOTOS, MAX_BYTES, TITLE_MIN, TITLE_MAX, DESC_MIN, DESC_MAX, AGE_MAX,
    STEPS, NON_ANIMAL,
    isAnimalCategory, blank, validateStep, validateAll,
    buildAd, priceFor, photoRoom, photoAccepted, photoKey, photoSrc, digits,
  };
})();
