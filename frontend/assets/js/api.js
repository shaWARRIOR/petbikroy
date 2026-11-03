/* ==========================================================================
   PetBikroy — data access layer

   The site talks to the Cloudflare Pages Functions API when one is reachable,
   and falls back to the bundled demo catalogue in data.js when it is not
   (opened from disk, no network, or a static-only deploy).

   Everything the pages need goes through here, so a page never has to know
   which of the two backends answered.

   Accounts
   --------
   Members sign in with a phone number and a password. The session lives in an
   HttpOnly cookie, so nothing here ever handles a credential beyond handing
   it to /api/auth/login and forgetting it. `API.user` holds the signed-in
   member (or null) for the whole page.

   Listings belong to accounts, so "can I edit this?" is a comparison of ids
   rather than a secret token kept in localStorage.
   ========================================================================== */

window.API = (() => {
  'use strict';

  const PROBE_TIMEOUT = 2500;

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

  const API = {
    /** True once a successful call to /api/stats has happened. */
    available: false,
    /** True once init() has finished, so the UI knows the probe has settled. */
    settled: false,
    /** Populated by init() so pages can render before their own fetch lands. */
    stats: null,
    /** The signed-in member, or null. Populated by init(). */
    user: null,

    /* ------------------------------------------------------------- probe */

    /** Decides whether the API is usable. Never throws. */
    async probe() {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT);

        const res = await fetch('/api/stats', {
          signal: controller.signal,
          headers: { accept: 'application/json' },
        });
        clearTimeout(timer);

        if (!res.ok) return false;

        const type = res.headers.get('content-type') || '';
        if (!type.includes('application/json')) return false;

        this.stats = await res.json();
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Probes the API and loads the current session at the same time, so a
     * signed-in visitor pays one round trip rather than two.
     */
    async init() {
      const [available] = await Promise.all([this.probe(), this.refreshUser()]);
      this.available = available;
      // Without an API there are no accounts at all, and the offline
      // catalogue takes over completely.
      if (!available) this.user = null;
      this.settled = true;
      return available;
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

    /* -------------------------------------------------------------- account */

    /** @returns {object|null} the signed-in member, refreshed from the server. */
    async refreshUser() {
      try {
        const data = await this.request('GET', '/api/auth/session');
        this.user = data.user || null;
      } catch {
        this.user = null;
      }
      return this.user;
    },

    isSignedIn() {
      return Boolean(this.user);
    },

    /** True when the caller may edit or delete this ad. */
    ownsAd(ad) {
      return Boolean(ad && this.user && ad.seller && ad.seller.id === this.user.id);
    },

    /**
     * Creates an account and signs in.
     * @returns {object} the new member
     */
    async register(profile) {
      if (!this.available) {
        throw new Error('Creating an account needs the live site.');
      }
      const data = await this.request('POST', '/api/auth/register', profile);
      this.user = data.user || null;
      return this.user;
    },

    /** Signs in with a phone number and password. */
    async login(phone, password) {
      if (!this.available) {
        throw new Error('Signing in needs the live site.');
      }
      const data = await this.request('POST', '/api/auth/login', { phone, password });
      this.user = data.user || null;
      return this.user;
    },

    async logout() {
      if (!this.available) return;
      try {
        await this.request('DELETE', '/api/auth/session');
      } catch { /* signing out locally is enough */ }
      this.user = null;
    },

    /** Saves profile edits. */
    async updateProfile(patch) {
      const data = await this.request('PATCH', '/api/auth/session', patch);
      this.user = data.user || this.user;
      return this.user;
    },

    async changePassword(currentPassword, newPassword) {
      return this.request('PUT', '/api/auth/password', { currentPassword, newPassword });
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
        const data = await this.request('GET', `/api/ads/${encodeURIComponent(id)}`);
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

    /** A seller's public profile and their live listings, or null. */
    async sellerProfile(id) {
      if (!this.available || !id) return null;
      try {
        return await this.request('GET', `/api/users/${encodeURIComponent(id)}`);
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
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
     * Publishes an ad as the signed-in member.
     * @returns {{ad: object, status: string}}
     */
    async createAd(payload) {
      if (!this.available) return this.offlineCreate(payload);

      const data = await this.request('POST', '/api/ads', payload);
      return { ad: data.ad, status: data.status };
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
        seller: { id: '', name: payload.contactName, joined: now, verified: false },
        contactPhone: payload.contactPhone,
        contactEmail: payload.contactEmail || '',
      };
      PB.saveAd(ad);
      return { ad, status: 'active', offline: true };
    },

    /**
     * Promotes (or unpromotes) an ad the signed-in owner posted. This is the
     * lightweight flag toggle used by "My ads" and the ad page, distinct from
     * the full PUT edit.
     */
    async promoteAd(id) {
      if (!this.available) {
        const existing = PB.getAd(id);
        if (!existing) throw new Error('That ad no longer exists.');
        const merged = { ...existing, featured: !existing.featured };
        PB.saveAd(merged);
        return { ad: merged, offline: true };
      }
      const data = await this.request('POST', `/api/ads/${encodeURIComponent(id)}/promote`);
      return { ad: data.ad, offline: false };
    },

    /* -------------------------------------------------- promotion (paid) */

    /**
     * The BDT cost of promoting for `durationDays`, using the live promotion
     * pricing from /api/stats. Returns null when the site has no paid
     * promotion enabled (or the browser is offline).
     */
    promotionCost(durationDays) {
      if (!this.available || !this.stats || !this.stats.promotePrice) return null;
      const days = Math.max(7, Math.trunc(Number(durationDays)) || 7);
      const perDays = this.stats.promoteDays || 7;
      const perPrice = this.stats.promotePrice;
      return Math.ceil(days / perDays) * perPrice;
    },

    /** The signed-in member's own promotion history. */
    async listPromotions() {
      if (!this.available) return { promotions: [], offline: true };
      const data = await this.request('GET', '/api/promotions');
      return data;
    },

    /**
     * Pays to promote one of the caller's active ads. Submits the payment
     * method + reference and leaves the order for an admin to confirm.
     */
    async createPromotion({ adId, durationDays, paymentMethod, paymentRef }) {
      if (!this.available) {
        const err = new Error('Promotion needs the live site.');
        err.status = 501;
        throw err;
      }
      const data = await this.request('POST', '/api/promotions', {
        adId,
        durationDays,
        paymentMethod,
        paymentRef,
      });
      return data;
    },

    /** Seller cancels their own still-pending promotion. */
    async cancelPromotion(id) {
      if (!this.available) {
        const err = new Error('Promotion needs the live site.');
        err.status = 501;
        throw err;
      }
      await this.request('PATCH', `/api/promotions/${encodeURIComponent(id)}/cancel`);
    },

    /** Whether the caller already has an active promotion on this ad. */
    hasActivePromotion(promotions, adId) {
      return (promotions || []).some(
        p => p.adId === adId && p.status === 'approved',
      );
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

      const data = await this.request('PUT', `/api/ads/${encodeURIComponent(id)}`, payload);
      return { ad: data.ad, offline: false };
    },

    /** Removes an ad the caller owns. */
    async deleteAd(id) {
      if (!this.available) {
        PB.deleteAd(id);
        return { ok: true, offline: true };
      }
      await this.request('DELETE', `/api/ads/${encodeURIComponent(id)}`);
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

    /* ------------------------------------------------------------- my ads */

    /**
     * Every listing the signed-in member has posted, drafts included.
     *
     * Online this is the account's own list from the server. Offline there is
     * no account, so it falls back to the ads this browser created.
     *
     * @returns {{ads: object[], offline: boolean, signedOut: boolean}}
     */
    async myAds() {
      if (!this.available) {
        return { ads: PB.getUserAds(), offline: true, signedOut: false };
      }
      if (!this.user) {
        return { ads: [], offline: false, signedOut: true };
      }
      try {
        const data = await this.request('GET', '/api/me/ads');
        return { ads: data.ads || [], counts: data.counts, offline: false, signedOut: false };
      } catch (err) {
        if (err.status === 401) {
          this.user = null;
          return { ads: [], offline: false, signedOut: true };
        }
        throw err;
      }
    },

    /* ---------------------------------------------------------- messages */

    /** Total unread messages, for the header badge. */
    async messageUnread() {
      if (!this.available) return 0;
      try {
        return (await this.request('GET', '/api/messages/unread')).total || 0;
      } catch {
        return 0;
      }
    },

    /** Every message thread, newest last message first. */
    async messageConversations() {
      if (!this.available) return [];
      try {
        return (await this.request('GET', '/api/messages/conversations')).conversations || [];
      } catch {
        return [];
      }
    },

    /** One thread with its messages. */
    async messageMessages(convId) {
      if (!this.available) return null;
      try {
        return await this.request('GET', `/api/messages/conversations/${encodeURIComponent(convId)}`);
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
    },

    /** Start (or resume) a thread with a seller, dropping the first message. */
    async messageStart({ adId, sellerId, body }) {
      if (!this.available) throw new Error('Messaging needs the live site.');
      return this.request('POST', '/api/messages/conversations', { adId, sellerId, message: body });
    },

    /** Send a message in an existing thread. */
    async messageSend(convId, body) {
      if (!this.available) throw new Error('Messaging needs the live site.');
      return this.request('POST', `/api/messages/conversations/${encodeURIComponent(convId)}/messages`, { message: body });
    },

    /** Mark a thread as read. */
    async messageRead(convId) {
      if (!this.available) return;
      try {
        return await this.request('PATCH', `/api/messages/conversations/${encodeURIComponent(convId)}/read`);
      } catch {
        return null;
      }
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
