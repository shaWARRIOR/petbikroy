/* ==========================================================================
   PetBikroy — browse / search results page
   Filters live in the URL so every result set is shareable and bookmarkable.
   Paging and counting are done by the API; the bundled catalogue answers when
   no API is reachable, so the page works either way.
   ========================================================================== */

(() => {
  'use strict';

  const { $, $$, esc } = UI;
  const PER_PAGE = 9;

  /* ------------------------------------------------------------- url state */

  const csv = key => (UI.qs().get(key) || '').split(',').map(s => s.trim()).filter(Boolean);
  const num = key => {
    const raw = UI.qs().get(key);
    if (raw === null || raw === '') return null;
    const v = Number(raw);
    return Number.isNaN(v) ? null : v;
  };

  function readState() {
    return {
      q:    UI.qs().get('q') || '',
      cat:  UI.qs().get('cat') || '',
      subs: csv('sub'),
      loc:  UI.qs().get('loc') || '',
      areas: csv('area'),
      min:  num('min'),
      max:  num('max'),
      sort: UI.qs().get('sort') || 'recent',
      sold: UI.qs().get('sold') === '1',
      page: Math.max(1, num('page') || 1),
      view: UI.qs().get('view') === 'list' ? 'list' : 'grid',
    };
  }

  let state = readState();

  /** Live sidebar counts, filled in once the facets request lands. */
  let facets = {
    categories: {}, subs: {}, locations: {}, areas: {}, total: 0,
  };

  /** Guards against an older request overwriting a newer one. */
  let renderToken = 0;

  /* ---------------------------------------------------------------- chrome */

  UI.mountChrome(state.cat);

  $('#viewGrid').innerHTML = UI.icon('grid', 16);
  $('#viewList').innerHTML = UI.icon('list', 16);

  $('#fSort').innerHTML = PB.SORTS
    .map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');

  $('#fLoc').innerHTML = '<option value="">All Bangladesh</option>' +
    PB.LOCATIONS.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');

  /* ----------------------------------------------------------- sidebar data */

  const catCount = id => facets.categories[id] || 0;
  const subCount = (cat, sub) => (facets.subs[cat] || {})[sub] || 0;
  const locCount = id => facets.locations[id] || 0;

  function renderCatList() {
    const total = facets.total || 0;
    const row = (id, name, emoji, n) => `
      <li><label>
        <input type="radio" name="catPick" value="${id}"${state.cat === id ? ' checked' : ''}>
        <span>${emoji} ${esc(name)}</span><span class="n">${n}</span>
      </label></li>`;

    $('#catList').innerHTML =
      row('', 'All categories', '🗂️', total) +
      PB.CATEGORIES.map(c => row(c.id, c.name, c.emoji, catCount(c.id))).join('');
  }

  function renderSubList() {
    if (!state.cat) {
      $('#subBlock').classList.add('hide');
      return;
    }
    const cat = PB.catById(state.cat);
    if (!cat) { $('#subBlock').classList.add('hide'); return; }

    $('#subBlock').classList.remove('hide');
    $('#subTitle').textContent = `${cat.name} — breed / type`;
    $('#subList').innerHTML = cat.subs.map(s => {
      const n = subCount(cat.id, s);
      return `<li><label${n === 0 ? ' style="opacity:.55"' : ''}>
        <input type="checkbox" class="subPick" value="${esc(s)}"${state.subs.includes(s) ? ' checked' : ''}>
        <span>${esc(s)}</span><span class="n">${n}</span>
      </label></li>`;
    }).join('');
  }

  function renderAreaList() {
    const wrap = $('#areaWrap');
    if (!state.loc) { wrap.classList.add('hide'); return; }
    const l = PB.locById(state.loc);
    if (!l) { wrap.classList.add('hide'); return; }
    wrap.classList.remove('hide');
    $('#areaList').innerHTML = l.areas.map(a => {
      const n = ((facets.areas || {})[l.id] || {})[a] || 0;
      return `<li><label${n === 0 ? ' style="opacity:.55"' : ''}>
        <input type="checkbox" class="areaPick" value="${esc(a)}"${state.areas.includes(a) ? ' checked' : ''}>
        <span>${esc(a)}</span>${n ? `<span class="n">${n}</span>` : ''}
      </label></li>`;
    }).join('');
  }

  const renderLocSelect = () => { $('#fLoc').value = state.loc; };

  /* --------------------------------------------------------------- results */

  function resultsQuery() {
    return {
      q: state.q, cat: state.cat, subs: state.subs,
      loc: state.loc, areas: state.areas,
      min: state.min, max: state.max,
      sort: state.sort, includeSold: state.sold,
      page: state.page, perPage: PER_PAGE,
    };
  }

  function renderHead(total) {
    const cat = state.cat ? PB.catById(state.cat) : null;
    const title = state.q
      ? `“${state.q}”`
      : cat ? `${cat.emoji} ${cat.name}`
      : state.loc ? `Ads in ${PB.locName(state.loc)}`
      : 'All ads';
    $('#resultTitle').textContent = title;

    const from = total ? (state.page - 1) * PER_PAGE + 1 : 0;
    const to = Math.min(state.page * PER_PAGE, total);
    $('#resultCount').textContent = total
      ? `${from}–${to} of ${PB.group(total)} ads`
      : 'No ads';
  }

  function renderChips() {
    const chips = [];
    const add = (label, patch) => chips.push({ label, patch });

    if (state.q)   add(`“${state.q}”`, { q: null });
    if (state.cat) add(PB.catName(state.cat), { cat: null, sub: null });
    for (const s of state.subs) add(s, { sub: state.subs.filter(x => x !== s) });
    if (state.loc) add(PB.locName(state.loc), { loc: null, area: null });
    for (const a of state.areas) add(a, { area: state.areas.filter(x => x !== a) });
    if (state.min != null) add(`min ${PB.SITE.currency}${PB.group(state.min)}`, { min: null });
    if (state.max != null) add(`max ${PB.SITE.currency}${PB.group(state.max)}`, { max: null });
    if (state.sold) add('including sold', { sold: null });

    $('#chips').innerHTML = chips.length
      ? chips.map((c, i) => `<span class="chip">${esc(c.label)}
          <button data-chip="${i}" aria-label="Remove filter">✕</button></span>`).join('')
      : '';

    $$('#chips [data-chip]').forEach(btn => {
      btn.addEventListener('click', () => {
        const patch = { ...chips[Number(btn.dataset.chip)].patch, page: null };
        Object.keys(patch).forEach(k => {
          if (Array.isArray(patch[k])) patch[k] = patch[k].length ? patch[k] : null;
        });
        commit(patch);
      });
    });
  }

  function renderPager(total, pages) {
    const host = $('#pager');
    if (pages <= 1) { host.innerHTML = ''; return; }

    const btn = (label, page, { active = false, disabled = false } = {}) =>
      `<button data-page="${page}"${active ? ' class="is-active"' : ''}${disabled ? ' disabled' : ''}>${label}</button>`;

    let html = btn('‹', state.page - 1, { disabled: state.page === 1 });
    const win = [];
    for (let p = 1; p <= pages; p++) {
      if (p === 1 || p === pages || Math.abs(p - state.page) <= 1) win.push(p);
    }
    let last = 0;
    for (const p of win) {
      if (last && p - last > 1) html += `<button disabled>…</button>`;
      html += btn(String(p), p, { active: p === state.page });
      last = p;
    }
    html += btn('›', state.page + 1, { disabled: state.page === pages });

    host.innerHTML = html;
    $$('#pager [data-page]').forEach(b => b.addEventListener('click', () => {
      commit({ page: Number(b.dataset.page) }, { scroll: true });
    }));
  }

  /** Keeps every widget except the result grid in sync with `state`. */
  function syncSidebar() {
    renderCatList();
    renderSubList();
    renderAreaList();
    renderLocSelect();

    $('#fSort').value = state.sort;
    $('#fMin').value = state.min == null ? '' : state.min;
    $('#fMax').value = state.max == null ? '' : state.max;
    $('#fSold').checked = state.sold;

    $('#viewGrid').classList.toggle('is-active', state.view === 'grid');
    $('#viewList').classList.toggle('is-active', state.view === 'list');
    $('#viewGrid').setAttribute('aria-pressed', String(state.view === 'grid'));
    $('#viewList').setAttribute('aria-pressed', String(state.view === 'list'));

    const trail = [{ label: 'Home', href: 'index.html' }, { label: 'All ads', href: 'listings.html' }];
    if (state.cat) trail.push({ label: PB.catName(state.cat), href: `listings.html?cat=${state.cat}` });
    if (state.loc) trail.push({ label: PB.locName(state.loc), href: `listings.html?loc=${state.loc}` });
    $('#crumbs').innerHTML = UI.crumbs(trail);
  }

  function showLoading() {
    const host = $('#results');
    host.className = 'grid-listings';
    host.innerHTML = Array.from({ length: PER_PAGE }, () =>
      '<div class="card ad-card" style="min-height:290px;opacity:.55">'
      + '<div class="skeleton" style="height:178px;border-radius:0"></div>'
      + '<div style="padding:12px 14px">'
      + '<div class="skeleton" style="width:70%;margin-bottom:8px"></div>'
      + '<div class="skeleton" style="width:40%"></div></div></div>').join('');
  }

  async function render() {
    syncSidebar();
    renderChips();
    renderHead(0);
    showLoading();

    const token = ++renderToken;

    let data;
    try {
      data = await API.listAds(resultsQuery());
    } catch (err) {
      if (token !== renderToken) return;
      $('#results').className = '';
      $('#results').innerHTML = UI.emptyState({
        emoji: '⚠️',
        title: 'Could not load ads',
        text: err.message || 'Something went wrong. Please try again.',
        action: { href: 'listings.html', label: 'Reload the page' },
      });
      return;
    }

    // A slower earlier request must not clobber a newer one.
    if (token !== renderToken) return;

    // The server clamps an out-of-range page; reflect that in the URL so the
    // address bar and the results agree.
    if (data.page !== state.page) {
      state.page = data.page;
      UI.setQuery({ page: data.page > 1 ? data.page : null }, { replace: true });
    }

    renderHead(data.total);
    renderChips();

    const host = $('#results');
    if (!data.ads.length) {
      host.className = '';
      host.innerHTML = data.total
        ? UI.emptyState({
            emoji: '📄',
            title: 'That page is empty',
            text: 'There are results, but not this many pages. Jump back to the first page.',
            action: { href: 'listings.html', label: 'Back to first page' },
          })
        : UI.emptyState({
            emoji: '🔍',
            title: 'No ads matched your search',
            text: state.cat || state.q || state.loc
              ? 'Try removing a filter or searching a broader term.'
              : 'Be the first to list something in this category.',
            action: { href: 'post.html', label: 'Post an ad — it\'s free' },
          });
    } else {
      UI.renderAds(host, data.ads, { listView: state.view === 'list' });
    }

    renderPager(data.total, data.pages);
  }

  /** Write a patch into the URL, then re-render from the new URL. */
  function commit(patch, { scroll = false } = {}) {
    // Any filter change resets pagination unless the patch sets it explicitly.
    if (!('page' in patch)) patch.page = null;
    UI.setQuery(patch);
    state = readState();
    render();
    if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* --------------------------------------------------------------- events */

  // Category (radio)
  $('#catList').addEventListener('change', e => {
    const el = e.target.closest('input[name="catPick"]');
    if (!el) return;
    commit({ cat: el.value || null, sub: null });
  });

  // Breeds (checkbox)
  $('#subList').addEventListener('change', e => {
    const el = e.target.closest('.subPick');
    if (!el) return;
    const next = $$('.subPick').filter(i => i.checked).map(i => i.value);
    commit({ sub: next.length ? next : null });
  });

  // Location + areas
  $('#fLoc').addEventListener('change', e => {
    commit({ loc: e.target.value || null, area: null });
  });
  $('#areaList').addEventListener('change', e => {
    const el = e.target.closest('.areaPick');
    if (!el) return;
    const next = $$('.areaPick').filter(i => i.checked).map(i => i.value);
    commit({ area: next.length ? next : null });
  });

  // Price
  const applyPrice = () => {
    const min = $('#fMin').value === '' ? null : Number($('#fMin').value);
    const max = $('#fMax').value === '' ? null : Number($('#fMax').value);
    if (min != null && max != null && min > max) {
      UI.toast('Minimum price is higher than maximum', 'err');
      return;
    }
    commit({ min, max });
  };
  $('#applyPrice').addEventListener('click', applyPrice);
  ['#fMin', '#fMax'].forEach(sel => $(sel).addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); applyPrice(); }
  }));

  // Sold toggle, sort, view
  $('#fSold').addEventListener('change', e => commit({ sold: e.target.checked ? '1' : null }));
  $('#fSort').addEventListener('change', e => commit({ sort: e.target.value }));
  $('#viewGrid').addEventListener('click', () => commit({ view: null }));
  $('#viewList').addEventListener('click', () => commit({ view: 'list' }));

  // Clear
  $('#clearAll').addEventListener('click', () => {
    UI.setQuery({ q: null, cat: null, sub: null, loc: null, area: null, min: null, max: null, sold: null, page: null });
    state = readState();
    render();
    UI.toast('Filters cleared', 'ok');
  });

  // Mobile filter drawer
  const filters = $('#filters'), backdrop = $('#filterBackdrop');
  const openF = () => { filters.classList.add('is-open'); backdrop.classList.add('is-open'); };
  const closeF = () => { filters.classList.remove('is-open'); backdrop.classList.remove('is-open'); };
  $('#openFilters').addEventListener('click', openF);
  $('#closeFilters').addEventListener('click', closeF);
  backdrop.addEventListener('click', closeF);

  // Applied from the header location picker (which already wrote the URL).
  document.addEventListener('pb:locchange', () => {
    state = readState();
    // Changing division usually shortens the result set, so return to page 1.
    if (state.page !== 1) {
      UI.setQuery({ page: null });
      state = readState();
    }
    render();
  });

  // Browser back/forward
  window.addEventListener('popstate', () => { state = readState(); render(); });

  // Deep link from the header search box on this page
  $('#hdrSearch')?.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    commit({
      q: String(fd.get('q') || '').trim() || null,
      cat: String(fd.get('cat') || '') || null,
      sub: null,
    });
  });

  /* ------------------------------------------------------------------ boot */

  (async () => {
    syncSidebar();
    showLoading();

    await API.ready;

    // Counts first, so the sidebar is correct before the grid settles.
    facets = await API.facets();
    render();

    // ...and once more after any refresh triggered by the header picker.
    document.addEventListener('pb:locchange', () => { render(); });
  })();
})();
