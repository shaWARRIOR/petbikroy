/* ==========================================================================
   PetBikroy — data access layer

   The site talks to the Cloudflare Pages Functions API when one is reachable,
   and falls back to the bundled demo catalogue in data.js when it is not
   (opened from disk, no network, or a static-only deploy).

   Everything the pages need goes through here, so a page never has to know
   which of the two backends answered.

   Ownership without accounts
   --------------------------
   POST /api/ads returns a one-time `ownerToken`. We keep it in localStorage
   alongside the ad id; sending it back in `x-owner-token` is what proves the
   right to edit or delete that listing. The server only ever stores its hash.
   ========================================================================== */

window.API = (() => {
  'use strict';

  const MINE_KEY = 'pb.v1.mine';
  const PROBE_TIMEOUT = 2500;

  /* ------------------------------------------------------------- storage */

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /* --------------------------------------------------------------- utils */

  function qs(params) {
    const out = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === null || v === undefined || v === '') continue;
      if (Array.isArray(v)) {
        if (v.length) out.set(k, v.join(','));
      } else if (typeof v === 'boolean') {
        if (v) out.set(k, '1');
      } else {
        out.set(k, String(v));
      }
    }
    return out.toString();
  }

  const delay = ms => new Promise(r => setTimeout(r, ms));

  /* ---------------------------------------------------------------- core */

  const API = {
    /** True once a successful call to /api/stats has happened. */
    available: false,
    /** Populated by init() so pages can render before their own fetch lands. */
    stats: null,

    /* ------------------------------------------------------------- probe */

    /**
     * Decides whether the API is usable. Never throws — a static-only deploy
     * is a supported way to run this site.
     */
    async init() {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT);

        const res = await fetch('/api/stats', {
          signal: controller.signal,
          headers: { accept: 'application/json' },
        });
        clearTimeout(timer);

        if (!res.ok) return (this.available = false);

        const type = res.headers.get('content-type') || '';
        if (!type.includes('application/json')) return (this.available = false);

        this.stats = await res.json();
        this.available = true;
      } catch {
        this.available = false;
      }
      return this.available;
    },

    /** Low-level JSON call. Throws API.Error with `.details` on 4xx. */
    async request(method, path, body, extraHeaders) {
      const headers = { accept: 'application/json', ...(extraHeaders || {}) };
      if (body !== undefined) headers['content-type'] = 'application/json';

      const res = await fetch(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      let data = null;
      const text = await res.text();
      if (text) { try { data = JSON.parse(text); } catch { /* not JSON */ } }

      if (!res.ok) {
        const err = new Error((data && data.error) || `Request failed (${res.status})`);
        err.status = res.status;
        err.details = (data && data.details) || {};
        throw err;
      }
      return data ?? {};
    },

    /* -------------------------------------------------------- public reads */

    /**
     * Filtered listing.
     * @returns {{ads: object[], total: number, page: number, pages: number, offline: boolean}}
     */
    async listAds(f = {}) {
      if (!this.available) return this.offlineList(f);

      try {
        const query = qs({
          q: f.q, cat: f.cat, sub: f.subs, loc: f.loc, area: f.areas,
          min: f.min, max: f.max,
          sort: f.sort === 'recent' ? null : f.sort,
          sold: f.includeSold,
          page: f.page || 1,
          perPage: f.perPage || 9,
        });
        const data = await this.request('GET', `/api/ads${query ? '?' + query : ''}`);
        return { ...data, offline: false };
      } catch (err) {
        // A dead API should degrade, not blank the page.
        if (err.status >= 500 || err.status === undefined) return this.offlineList(f);
        throw err;
      }
    },

    /** Local fallback using the bundled catalogue. */
    offlineList(f = {}) {
      let ads = PB.search({
        q: f.q, cat: f.cat, subs: f.subs, loc: f.loc, areas: f.areas,
        min: f.min, max: f.max, sort: f.sort, includeSold: f.includeSold,
      });
      const perPage = f.perPage || 9;
      const total = ads.length;
      const pages = Math.max(1, Math.ceil(total / perPage));
      const page = Math.min(Math.max(1, f.page || 1), pages);
      ads = ads.slice((page - 1) * perPage, page * perPage);
      return { ads, total, page, pages, perPage, offline: true };
    },

    /** A single ad by id, or null when it does not exist. */
    async getAd(id) {
      if (!this.available) {
        const ad = PB.getAd(id);
        return ad ? { ad, offline: true } : null;
      }
      try {
        const data = await this.request('GET', `/api/ads/${encodeURIComponent(id)}`,
                                        undefined, this.ownerHeader(id));
        return {
          ad: data.ad,
          rejectionReason: data.rejectionReason || '',
          offline: false,
        };
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
    },

    /** Resolves a list of ids, skipping any that have gone. */
    async getAdsByIds(ids) {
      if (!ids.length) return [];
      if (!this.available) {
        return ids.map(id => PB.getAd(id)).filter(Boolean);
      }
      const results = await Promise.all(ids.map(async id => {
        try {
          const found = await this.getAd(id);
          if (!found) return null;
          // Carry the moderator's note alongside the ad so management screens
          // can tell the seller why something was turned down.
          if (found.rejectionReason) found.ad.rejectionReason = found.rejectionReason;
          return found.ad;
        } catch {
          return null;
        }
      }));
      return results.filter(Boolean);
    },

    /** Sidebar counts. */
    async facets() {
      if (!this.available) return this.offlineFacets();
      try {
        return await this.request('GET', '/api/facets');
      } catch {
        return this.offlineFacets();
      }
    },

    offlineFacets() {
      return {
        total: PB.getAllAds().filter(a => a.status === 'active').length,
        categories: PB.countByCategory(),
        subs: PB.CATEGORIES.reduce((acc, c) => {
          acc[c.id] = PB.countBySub(c.id);
          return acc;
        }, {}),
        locations: PB.countByLocation(),
        areas: PB.LOCATIONS.reduce((acc, l) => {
          const inLoc = PB.getAllAds().filter(a => a.loc === l.id && a.status === 'active');
          acc[l.id] = inLoc.reduce((m, a) => {
            m[a.area] = (m[a.area] || 0) + 1;
            return m;
          }, {});
          return acc;
        }, {}),
      };
    },

    /* --------------------------------------------------------------- writes */

    /**
     * Publishes an ad.
     * @returns {{ad: object, ownerToken: string, status: string}}
     */
    async createAd(payload) {
      if (!this.available) return this.offlineCreate(payload);

      const data = await this.request('POST', '/api/ads', payload);
      if (data.ownerToken) {
        this.rememberAd(data.ad.id, data.ownerToken, data.ad.title);
      }
      return data;
    },

    /**
     * Local-only publish: supports posting when the site is served without a
     * backend. The ad lives in this browser only, which the UI says plainly.
     */
    offlineCreate(payload) {
      const now = new Date().toISOString();
      const ad = {
        id: PB.newId(),
        cat: payload.categoryId,
        sub: payload.subcategory,
        title: payload.title,
        desc: payload.description,
        price: payload.kind === 'adoption' ? 0 : payload.price,
        negotiable: !!payload.negotiable,
        kind: payload.kind,
        loc: payload.locationId,
        area: payload.area,
        age: payload.age || '',
        gender: payload.gender || '',
        vaccinated: !!payload.vaccinated,
        condition: payload.condition || 'New',
        status: 'active',
        featured: false,
        views: 0,
        created: now,
        photos: payload.photos || [],
        seller: { name: payload.contactName, joined: now, verified: false, ads: 1 },
        contactPhone: payload.contactPhone,
        contactEmail: payload.contactEmail || '',
      };
      PB.saveAd(ad);
      return { ad, ownerToken: null, status: 'active', offline: true };
    },

    /** Edits an ad the caller owns. */
    async updateAd(id, payload) {
      if (!this.available) {
        const existing = PB.getAd(id);
        if (!existing) throw new Error('That ad no longer exists.');
        const merged = {
          ...existing,
          ...payload,
          cat: payload.categoryId, sub: payload.subcategory,
          loc: payload.locationId, desc: payload.description,
          price: payload.kind === 'adoption' ? 0 : payload.price,
          seller: { ...existing.seller, name: payload.contactName },
        };
        PB.saveAd(merged);
        return { ad: merged, offline: true };
      }

      const data = await this.request('PUT', `/api/ads/${encodeURIComponent(id)}`,
                                      payload, this.ownerHeader(id));
      return { ad: data.ad, offline: false };
    },

    /** Removes an ad the caller owns. */
    async deleteAd(id) {
      if (!this.available) {
        PB.deleteAd(id);
        this.forgetAd(id);
        return { ok: true, offline: true };
      }
      await this.request('DELETE', `/api/ads/${encodeURIComponent(id)}`,
                         undefined, this.ownerHeader(id));
      this.forgetAd(id);
      return { ok: true, offline: false };
    },

    /** Counts one view, deduplicated server-side per visitor per day. */
    async trackView(id) {
      if (!this.available) { PB.bumpViews(id); return null; }
      try {
        return await this.request('POST', `/api/ads/${encodeURIComponent(id)}/view`);
      } catch {
        return null;    // a lost view is never worth surfacing to the user
      }
    },

    /** Files a report against an ad. */
    async report(adId, reason, note) {
      if (!this.available) throw new Error('Reporting needs the live site.');
      return this.request('POST', '/api/reports', { adId, reason, note });
    },

    async reportReasons() {
      if (!this.available) return [];
      try {
        return (await this.request('GET', '/api/reports')).reasons || [];
      } catch {
        return [];
      }
    },

    /**
     * Uploads photos to R2 and returns their storage keys.
     * On a static-only deploy the files are inlined as data URLs instead, so
     * posting still works offline (at the cost of localStorage size).
     */
    async uploadPhotos(files) {
      const list = Array.from(files || []).slice(0, 6);
      if (!list.length) return [];

      if (!this.available) return Promise.all(list.map(readAsDataUrl));

      const form = new FormData();
      list.forEach(file => form.append('photos', file));

      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || 'The photos could not be uploaded.');
        err.status = res.status;
        throw err;
      }
      return data.keys || [];
    },

    /* ------------------------------------------------------- my ads (local) */

    /** @returns {Array<{id: string, token: string, title: string, created: string}>} */
    myAds() {
      const list = readJson(MINE_KEY, []);
      return Array.isArray(list) ? list : [];
    },

    rememberAd(id, token, title) {
      const list = this.myAds().filter(a => a.id !== id);
      list.unshift({ id, token, title: title || '', created: new Date().toISOString() });
      writeJson(MINE_KEY, list);
    },

    forgetAd(id) {
      writeJson(MINE_KEY, this.myAds().filter(a => a.id !== id));
    },

    ownsAd(id) {
      return this.myAds().some(a => a.id === id);
    },

    tokenFor(id) {
      const entry = this.myAds().find(a => a.id === id);
      return entry ? entry.token : null;
    },

    /** The header that proves ownership, or nothing when we do not own it. */
    ownerHeader(id) {
      const token = this.tokenFor(id);
      return token ? { 'x-owner-token': token } : undefined;
    },
  };

  /* -------------------------------------------------------------- helpers */

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('That file could not be read.'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Waits for the API probe, but never blocks a page for long: the fallback
   * catalogue renders immediately if the probe is slow.
   */
  API.ready = API.init();

  return API;
})();
