/* ==========================================================================
   PetBikroy — shared UI layer
   Header, footer, icons, listing cards, toasts, favourites.
   ========================================================================== */

const UI = (() => {
  'use strict';

  /* --------------------------------------------------------------- icons */

  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    pin:    '<path d="M12 22s7-6.2 7-12A7 7 0 0 0 5 10c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/>',
    heart:  '<path d="M12 20.5 4.6 13a4.8 4.8 0 0 1 6.8-6.8l.6.6.6-.6A4.8 4.8 0 0 1 19.4 13z"/>',
    user:   '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    plus:   '<path d="M12 5v14M5 12h14"/>',
    menu:   '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close:  '<path d="M6 6l12 12M18 6L6 18"/>',
    grid:   '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
    list:   '<path d="M4 6h16M4 12h16M4 18h16"/>',
    phone:  '<path d="M6.5 3.5h3l1.5 4-2 1.4a12 12 0 0 0 5.6 5.6l1.4-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z"/>',
    chat:   '<path d="M20 12.5a7 7 0 0 1-7 7H8l-4 3v-4.6A7 7 0 0 1 9 5.5h4a7 7 0 0 1 7 7z"/>',
    check:  '<path d="M4.5 12.5l5 5 10-11"/>',
    shield: '<path d="M12 3l7 3v6c0 4.5-3 8-7 9.5C8 20 5 16.5 5 12V6z"/><path d="M9 12l2 2 4-4.5"/>',
    chevL:  '<path d="M15 5l-7 7 7 7"/>',
    chevR:  '<path d="M9 5l7 7-7 7"/>',
    eye:    '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.8"/>',
    trash:  '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
    edit:   '<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/>',
    camera: '<path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    star:   '<path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z"/>',
    car:    '<path d="M4 13l1.6-4.4A2 2 0 0 1 7.5 7h9a2 2 0 0 1 1.9 1.6L20 13v5h-3v-2H7v2H4z"/>',
    clock:  '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/>',
  };

  function icon(name, size = 18, stroke = 1.9) {
    const d = ICONS[name] || '';
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round"
      stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  }

  /* --------------------------------------------------------------- utils */

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function qs() { return new URLSearchParams(location.search); }

  function setQuery(patch, { replace = false } = {}) {
    const p = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) p.delete(k);
      else p.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
    const url = location.pathname + (p.toString() ? '?' + p.toString() : '');
    history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }

  function debounce(fn, ms = 320) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2)
      .map(w => w[0] || '').join('').toUpperCase() || '?';
  }

  /* -------------------------------------------------------------- toasts */

  let toastHost = null;
  function toast(msg, kind = '') {
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.className = 'toast-wrap';
      toastHost.setAttribute('role', 'status');
      toastHost.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastHost);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = (kind === 'ok' ? icon('check', 16) : '') + `<span>${esc(msg)}</span>`;
    toastHost.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => el.remove(), 260);
    }, 2400);
  }

  /* ---------------------------------------------------------- ad card HTML */

  function priceHtml(ad) {
    const p = PB.formatPrice(ad.price, ad.negotiable);
    if (p.free) return `<div class="ad-price is-free">Free</div>`;
    return `<div class="ad-price"><span class="cur">${PB.SITE.currency}</span>${PB.group(ad.price)}${ad.negotiable ? '<span class="tiny muted"> negotiable</span>' : ''}</div>`;
  }

  function adCard(ad, { listView = false } = {}) {
    const fav = PB.isFavorite(ad.id);
    const imgs = PB.adImages(ad);
    const sold = ad.status === 'sold';
    const tags = [];
    if (ad.gender) tags.push(ad.gender);
    if (ad.age) tags.push(ad.age);
    if (ad.vaccinated) tags.push('Vaccinated');

    return `<article class="ad-card" data-ad="${esc(ad.id)}">
      <a class="ad-media" href="ad.html?id=${encodeURIComponent(ad.id)}" aria-label="${esc(ad.title)}">
        ${ad.featured && !sold ? '<span class="ribbon">Promoted</span>' : ''}
        ${sold ? '<span class="ribbon ribbon-sold">Sold</span>' : ''}
        <img src="${imgs[0]}" alt="${esc(ad.sub || ad.title)}" loading="lazy">
      </a>
      <button class="fav-btn${fav ? ' is-active' : ''}" data-fav="${esc(ad.id)}"
        aria-label="${fav ? 'Remove from' : 'Add to'} favourites" aria-pressed="${fav}">
        ${icon('heart', 17)}
      </button>
      <div class="ad-body">
        ${priceHtml(ad)}
        <a class="ad-title" href="ad.html?id=${encodeURIComponent(ad.id)}">${esc(ad.title)}</a>
        ${tags.length ? `<div class="ad-tags">${tags.map(t =>
          `<span class="tag${t === 'Vaccinated' ? ' tag-green' : ''}">${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="ad-meta">
          <span class="loc" title="${esc(ad.area ? ad.area + ', ' + PB.locName(ad.loc) : PB.locName(ad.loc))}">
            ${icon('pin', 13)}<span>${esc(ad.area || PB.locName(ad.loc))}</span>
          </span>
          <span class="nowrap">${esc(PB.timeAgo(ad.created))}</span>
        </div>
      </div>
    </article>`;
  }

  function renderAds(host, ads, opts = {}) {
    if (!ads.length) {
      host.className = '';
      host.innerHTML = emptyState(opts.empty || {});
      return;
    }
    host.className = 'grid-listings' + (opts.listView ? ' list-view' : '');
    host.innerHTML = ads.map(a => adCard(a, opts)).join('');
  }

  function emptyState({ emoji = '🐾', title = 'No ads found', text = '', action = null } = {}) {
    return `<div class="empty">
      <div class="emoji">${emoji}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(text || 'Try a different search term, or widen your filters.')}</p>
      ${action ? `<a class="btn btn-primary" href="${esc(action.href)}">${esc(action.label)}</a>` : ''}
    </div>`;
  }

  /* -------------------------------------------------- favourites delegation */

  function bindFavorites(root = document) {
    root.addEventListener('click', e => {
      const btn = e.target.closest('[data-fav]');
      if (!btn) return;
      e.preventDefault();
      const id = btn.dataset.fav;
      const added = PB.toggleFavorite(id);
      btn.classList.toggle('is-active', added);
      btn.setAttribute('aria-pressed', String(added));
      btn.setAttribute('aria-label', (added ? 'Remove from' : 'Add to') + ' favourites');
      updateFavBadge();
      toast(added ? 'Saved to favourites' : 'Removed from favourites', added ? 'ok' : '');
      document.dispatchEvent(new CustomEvent('pb:favchange', { detail: { id, added } }));
    });
  }

  function updateFavBadge() {
    const n = PB.getFavorites().length;
    $$('[data-fav-count]').forEach(el => {
      el.textContent = n;
      el.classList.toggle('hide', n === 0);
    });
  }

  /* ------------------------------------------------------------- header */

  function catNavItems(activeCat) {
    return PB.CATEGORIES.map(c =>
      `<a href="listings.html?cat=${c.id}"${activeCat === c.id ? ' class="is-active"' : ''}>${c.name}</a>`
    ).join('');
  }

  function header(activeCat = '') {
    const locs = PB.LOCATIONS.map(l =>
      `<option value="${l.id}"${PB.getPrefLocation() === l.id ? ' selected' : ''}>${esc(l.name)}</option>`
    ).join('');
    const cats = PB.CATEGORIES.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');

    return `
<header class="site-header">
  <div class="wrap header-top">
    <button class="icon-btn hamburger" id="openDrawer" aria-label="Open menu">${icon('menu', 20)}</button>

    <a class="logo" href="index.html" aria-label="${PB.SITE.name} home">
      <span class="logo-mark">🐾</span>
      <span class="logo-text">Pet<span>Bikroy</span></span>
    </a>

    <div class="loc-pick" title="Browse ads in">
      ${icon('pin', 16)}
      <label class="sr-only" for="hdrLoc">Location</label>
      <select id="hdrLoc">
        <option value="">All Bangladesh</option>
        ${locs}
      </select>
    </div>

    <form class="search-bar" id="hdrSearch" role="search" action="listings.html" method="get">
      <label class="sr-only" for="hdrCat">Category</label>
      <select name="cat" id="hdrCat">
        <option value="">All categories</option>
        ${cats}
      </select>
      <label class="sr-only" for="hdrQ">Search pets</label>
      <input type="search" name="q" id="hdrQ" placeholder="Search puppies, Persian cats, aquariums…" autocomplete="off">
      <button type="submit" aria-label="Search">${icon('search', 20)}</button>
    </form>

    <div class="header-actions">
      <a class="icon-btn" href="favorites.html" aria-label="Favourites">
        ${icon('heart', 19)}
        <span class="badge hide" data-fav-count>0</span>
      </a>
      <a class="header-user" href="my-ads.html" title="My ads">
        <span class="avatar">${initials('Guest')}</span>
        <span class="un">My ads</span>
      </a>
      <a class="btn btn-accent" href="post.html">${icon('plus', 17)} Post your ad</a>
    </div>
  </div>

  <nav class="cat-nav" aria-label="Pet categories">
    <div class="wrap cat-nav-inner">
      <a class="all-cats" href="listings.html">${icon('grid', 16)} All categories</a>
      ${catNavItems(activeCat)}
    </div>
  </nav>
</header>

<div class="drawer-backdrop" id="drawerBackdrop"></div>
<aside class="drawer" id="drawer" aria-hidden="true" aria-label="Menu">
  <div class="drawer-head">
    <span class="logo-mark">🐾</span>
    <strong class="logo-text">Pet<span>Bikroy</span></strong>
    <button class="icon-btn push" id="closeDrawer" aria-label="Close menu">${icon('close', 18)}</button>
  </div>
  <div class="drawer-body">
    <a href="post.html" class="btn btn-accent btn-block" style="margin:6px 0 12px">${icon('plus', 17)} Post your ad</a>
    <a href="index.html">🏠 Home</a>
    <a href="listings.html">🔎 Browse all ads</a>
    <a href="favorites.html">❤️ Favourites <span class="push"></span></a>
    <a href="my-ads.html">📋 My ads</a>

    <h4>Categories</h4>
    ${PB.CATEGORIES.map(c => `<a href="listings.html?cat=${c.id}">${c.emoji} ${esc(c.name)}</a>`).join('')}

    <h4>Locations</h4>
    ${PB.LOCATIONS.map(l => `<a href="listings.html?loc=${l.id}">${icon('pin', 15)} ${esc(l.name)}</a>`).join('')}
  </div>
</aside>`;
  }

  /* ------------------------------------------------------------- footer */

  function footer() {
    const year = new Date().getFullYear();
    return `
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <div class="footer-brand">
          <span class="logo-mark">🐾</span>
          <strong class="logo-text">Pet<span style="color:var(--orange)">Bikroy</span></strong>
        </div>
        <p>${esc(PB.SITE.tagline)}. Post a free ad in under two minutes and reach
        thousands of pet lovers across all 8 divisions.</p>
        <p class="tiny" style="color:#8b959d">Email ${esc(PB.SITE.email)} · ${esc(PB.SITE.phone)}</p>
      </div>
      <div>
        <h4>Popular</h4>
        <a href="listings.html?cat=dogs">Dogs</a>
        <a href="listings.html?cat=cats">Cats</a>
        <a href="listings.html?cat=birds">Birds</a>
        <a href="listings.html?cat=fish">Fish &amp; Aquarium</a>
        <a href="listings.html?cat=small-pets">Small Pets</a>
      </div>
      <div>
        <h4>Selling</h4>
        <a href="post.html">Post an ad</a>
        <a href="my-ads.html">Manage my ads</a>
        <a href="favorites.html">Saved ads</a>
        <a href="post.html">Ad posting tips</a>
      </div>
      <div>
        <h4>Help</h4>
        <a href="#">Safety guidelines</a>
        <a href="#">Terms of use</a>
        <a href="#">Privacy policy</a>
        <a href="#">Contact support</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© ${year} ${esc(PB.SITE.name)} — a demo marketplace. Not affiliated with bikroy.com.</span>
      <span>Made with 🐾 in Bangladesh</span>
    </div>
  </div>
</footer>`;
  }

  /* ------------------------------------------------------- header wiring */

  function mountChrome(activeCat = '') {
    const hHost = document.createElement('div');
    hHost.innerHTML = header(activeCat);
    // Snapshot first: `children` is a live collection during prepend().
    document.body.prepend(...Array.from(hHost.children));

    const fHost = document.createElement('div');
    fHost.innerHTML = footer();
    document.body.appendChild(fHost.firstElementChild);

    // Location selector -> remember + jump to filtered results.
    const sel = $('#hdrLoc');
    if (sel) {
      sel.addEventListener('change', () => {
        PB.setPrefLocation(sel.value);
        if (/listings\.html$/.test(location.pathname)) {
          setQuery({ loc: sel.value || null, area: null });
          document.dispatchEvent(new CustomEvent('pb:locchange', { detail: { loc: sel.value } }));
        } else if (sel.value) {
          location.href = 'listings.html?loc=' + encodeURIComponent(sel.value);
        }
      });
    }

    // Drawer
    const drawer = $('#drawer'), backdrop = $('#drawerBackdrop');
    const open = () => { drawer.classList.add('is-open'); backdrop.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); };
    const close = () => { drawer.classList.remove('is-open'); backdrop.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); };
    $('#openDrawer')?.addEventListener('click', open);
    $('#closeDrawer')?.addEventListener('click', close);
    backdrop?.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    // Pre-fill the header search from the current URL.
    const p = qs();
    if ($('#hdrQ')) $('#hdrQ').value = p.get('q') || '';
    if ($('#hdrCat') && p.get('cat')) $('#hdrCat').value = p.get('cat');
    if (sel && p.get('loc')) sel.value = p.get('loc');

    updateFavBadge();
    bindFavorites(document);

    document.dispatchEvent(new CustomEvent('pb:chrome'));
  }

  /* ----------------------------------------------------------- breadcrumbs */

  function crumbs(trail) {
    return `<nav class="crumbs" aria-label="Breadcrumb">` +
      trail.map((c, i) => {
        const last = i === trail.length - 1;
        const sep = i ? '<span class="sep">›</span>' : '';
        return sep + (last || !c.href
          ? `<span>${esc(c.label)}</span>`
          : `<a href="${esc(c.href)}">${esc(c.label)}</a>`);
      }).join('') + `</nav>`;
  }

  return {
    ICONS, icon, $, $$, esc, qs, setQuery, debounce, initials,
    toast, adCard, renderAds, emptyState, priceHtml,
    bindFavorites, updateFavBadge, header, footer, mountChrome, crumbs,
  };
})();
