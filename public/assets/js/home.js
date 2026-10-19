/* ==========================================================================
   PetBikroy — homepage

   Everything below is rendered from the API when one is reachable, and from
   the bundled catalogue when it is not. `API.listAds`/`API.facets` already
   handle that choice, so this file never branches on it.
   ========================================================================== */

(() => {
  'use strict';

  UI.mountChrome();

  const { $ } = UI;

  /* ---------------------------------------------------------- hero search */

  const heroCat = $('#heroCat');
  heroCat.innerHTML =
    '<option value="">All categories</option>' +
    PB.CATEGORIES.map(c => `<option value="${c.id}">${UI.esc(c.name)}</option>`).join('');

  /* -------------------------------------------------------- popular searches */

  $('#popular').innerHTML = PB.popularSearches().map(term =>
    `<a class="chip" href="listings.html?q=${encodeURIComponent(term)}">${UI.esc(term)}</a>`
  ).join('');

  /* -------------------------------------------------------------- skeletons */

  const skeletonCards = n =>
    Array.from({ length: n }, () =>
      '<div class="card ad-card" style="min-height:250px;opacity:.5">'
      + '<div class="skeleton" style="height:170px;border-radius:0"></div></div>').join('');

  $('#featuredGrid').innerHTML = skeletonCards(4);
  $('#newGrid').innerHTML = skeletonCards(8);

  /* ------------------------------------------------------------------- load */

  async function load() {
    await API.ready;

    facade();
    await Promise.all([loadStats(), loadListings(), loadLocations()]);
  }

  /* ------------------------------------------------------------ statistics */

  async function loadStats() {
    let stats = API.stats;

    if (!stats) {
      // Offline: derive the same numbers from the bundled catalogue.
      const local = PB.stats();
      stats = {
        ads: local.ads, categories: local.categories,
        locations: local.locations, sold: 0,
      };
    }

    countUp($('#statAds'), stats.ads);
    countUp($('#statCats'), stats.categories);
    countUp($('#statLocs'), stats.locations);
  }

  /** Animates a number so the hero does not just snap. Respects reduced motion. */
  function countUp(el, target) {
    if (!el) return;
    const value = Number(target) || 0;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (reduced || value < 10) { el.textContent = PB.group(value); return; }

    const duration = 650;
    const started = performance.now();
    const step = now => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = PB.group(Math.round(value * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------- listings */

  async function loadListings() {
    const featuredSection = $('#featuredGrid').closest('.section');

    const [promoted, fresh] = await Promise.all([
      API.listAds({ sort: 'recent', page: 1, perPage: 24 }),
      API.listAds({ sort: 'recent', page: 1, perPage: 8 }),
    ]);

    const featured = promoted.ads.filter(a => a.featured).slice(0, 4);
    if (featured.length) {
      UI.renderAds($('#featuredGrid'), featured);
    } else {
      featuredSection.classList.add('hide');
    }

    if (fresh.ads.length) {
      UI.renderAds($('#newGrid'), fresh.ads);
    } else {
      $('#newGrid').innerHTML = UI.emptyState({
        emoji: '🐾',
        title: 'No ads yet',
        text: 'Be the first to list a pet on PetBikroy.',
        action: { href: 'post.html', label: 'Post an ad — it\'s free' },
      });
    }
  }

  /* ------------------------------------------------------------ locations */

  async function loadLocations() {
    const facets = await API.facets();
    const counts = facets.locations || {};

    const ranked = PB.LOCATIONS
      .map(l => ({ ...l, n: counts[l.id] || 0 }))
      .sort((a, b) => b.n - a.n);

    $('#locGrid').innerHTML = ranked.map(l =>
      `<a class="cat-tile" href="listings.html?loc=${l.id}">
        <span class="emoji">📍</span>
        <span class="name">${UI.esc(l.name)}</span>
        <span class="count">${l.n} ad${l.n === 1 ? '' : 's'}</span>
      </a>`
    ).join('');
  }

  /* --------------------------------------------------------------- category counts */

  async function facade() {
    const facets = await API.facets();
    const counts = facets.categories || {};

    $('#catGrid').innerHTML = PB.CATEGORIES.map(c => {
      const n = counts[c.id] || 0;
      return `<a class="cat-tile" href="listings.html?cat=${c.id}">
        <span class="emoji">${c.emoji}</span>
        <span class="name">${UI.esc(c.name)}</span>
        <span class="count">${n} ad${n === 1 ? '' : 's'}</span>
      </a>`;
    }).join('');
  }

  /* ----------------------------------------------------------- live refresh */

  // Posting or deleting in another tab changes the counts on this one.
  window.addEventListener('storage', e => {
    if (e.key && e.key.startsWith('pb.v1.')) location.reload();
  });

  load();
})();
