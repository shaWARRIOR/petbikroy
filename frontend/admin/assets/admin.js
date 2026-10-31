/* ==========================================================================
   PetBikroy — admin panel

   A single-file, dependency-free SPA over the /api/admin/* endpoints.
   Views are hash-routed (#/listings, #/reports …) so the back button works
   and any view can be linked to directly.

   Security notes:
     * the session is an HttpOnly cookie, so nothing here can read it —
       signed-in state is decided by asking the server;
     * every response is escaped before it reaches innerHTML;
     * destructive actions always go through a confirmation dialog.
   ========================================================================== */

(() => {
  'use strict';

  /* ================================================================ helpers */

  const $ = (sel, root = document) => root.querySelector(sel);

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  /** Escapes for interpolation into HTML, including inside attributes. */
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESCAPES[c]);

  /** Thousands separators without relying on ICU locale data. */
  function group(n) {
    const s = String(Math.round(Number(n) || 0));
    const neg = s.startsWith('-');
    const digits = neg ? s.slice(1) : s;
    let out = '';
    for (let i = 0; i < digits.length; i++) {
      if (i && (digits.length - i) % 3 === 0) out += ',';
      out += digits[i];
    }
    return (neg ? '-' : '') + out;
  }

  const money = n => `৳${group(n)}`;

  function fmtDate(iso, withTime = false) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const opts = withTime
      ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: 'numeric', month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-GB', opts);
  }

  /** "3 days ago" — used in feeds where absolute dates are noise. */
  function ago(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(diff)) return '';
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    if (days < 31) return `${days} day${days === 1 ? '' : 's'} ago`;
    return fmtDate(iso);
  }

  const plural = (n, one, many) => `${group(n)} ${n === 1 ? one : (many || one + 's')}`;

  /* ============================================================== api client */

  class ApiError extends Error {
    constructor(message, status, details) {
      super(message);
      this.status = status;
      this.details = details || {};
    }
  }

  const api = {
    async request(method, path, body) {
      let res;
      try {
        res = await fetch(path, {
          method,
          credentials: 'same-origin',
          headers: body === undefined ? {} : { 'content-type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch {
        throw new ApiError('Network unreachable. Is the server running?', 0);
      }

      let data = null;
      const text = await res.text();
      if (text) { try { data = JSON.parse(text); } catch { /* non-JSON error page */ } }

      if (!res.ok) {
        throw new ApiError(
          (data && data.error) || `Request failed (${res.status})`,
          res.status,
          data && data.details,
        );
      }
      return data ?? {};
    },
    get:    (p) => api.request('GET', p),
    post:   (p, b) => api.request('POST', p, b),
    put:    (p, b) => api.request('PUT', p, b),
    patch:  (p, b) => api.request('PATCH', p, b),
    delete: (p) => api.request('DELETE', p),
  };

  /* ================================================================== state */

  const state = {
    admin: null,
    view: 'overview',
    counts: { pending: 0, openReports: 0 },
    listings: { page: 1, status: 'all', q: '', cat: '', loc: '' },
    members: { page: 1, filter: 'all', q: '' },
    reports: { status: 'open' },
  };

  /** Category id -> name/emoji, loaded once from /api/taxonomy at boot. */
  let PB_CATEGORIES = [];

  const isAdmin = () => state.admin && state.admin.role === 'admin';

  /* ================================================================= toasts */

  function toast(message, kind = 'ok', ms = 3600) {
    const icons = { ok: '✓', err: '✕', warn: '!', info: 'i' };
    const node = document.createElement('div');
    node.className = `toast ${kind === 'info' ? '' : kind}`.trim();
    node.innerHTML = `<span class="ico">${icons[kind] || '•'}</span><span>${esc(message)}</span>`;
    $('#toasts').appendChild(node);
    setTimeout(() => {
      node.style.transition = 'opacity .2s';
      node.style.opacity = '0';
      setTimeout(() => node.remove(), 200);
    }, ms);
  }

  /* ================================================================== modal */

  /**
   * Opens a dialog.
   *
   * Resolves with:
   *   * `onConfirm(back)`'s return value  — the primary button
   *   * `{ action: name }`                — one of the optional `actions` buttons
   *   * `null`                            — cancelled, backdrop click, or Escape
   *
   * The modal owns all of its own buttons and stops them reaching the page's
   * delegated click handler, so nested flows stay predictable.
   */
  function modal({
    title, bodyHtml, actions = [],
    confirmText = 'Confirm', cancelText = 'Cancel',
    danger = false, onConfirm,
  }) {
    return new Promise(resolve => {
      const back = document.createElement('div');
      back.className = 'modal-back';

      const actionBtns = actions.map(a => `
        <button class="btn ${esc(a.cls || 'btn-outline')} btn-sm"
                data-x="action" data-action="${esc(a.act)}">${esc(a.label)}</button>`).join('');

      back.innerHTML = `
        <div class="modal${actions.length ? ' wide' : ''}" role="dialog"
             aria-modal="true" aria-label="${esc(title)}">
          <div class="modal-head"><h2>${esc(title)}</h2></div>
          <div class="modal-body">${bodyHtml}</div>
          <div class="modal-foot">
            ${actions.length ? `<div class="bar" style="margin-right:auto">${actionBtns}</div>` : ''}
            ${cancelText ? `<button class="btn btn-outline" data-x="cancel">${esc(cancelText)}</button>` : ''}
            <button class="btn ${danger ? 'btn-danger' : ''}" data-x="ok">${esc(confirmText)}</button>
          </div>
        </div>`;

      const onKey = e => { if (e.key === 'Escape') close(null); };
      const close = value => {
        back.remove();
        document.removeEventListener('keydown', onKey);
        resolve(value);
      };

      back.addEventListener('click', async e => {
        if (e.target === back) return close(null);

        const btn = e.target.closest('[data-x]');
        if (!btn) return;

        if (btn.dataset.x === 'cancel') return close(null);
        if (btn.dataset.x === 'action') return close({ action: btn.dataset.action });

        // The primary button: run the callback, keeping the dialog open if it
        // throws so the user can read the error and try again.
        btn.disabled = true;
        try {
          close(onConfirm ? await onConfirm(back) : true);
        } catch (err) {
          btn.disabled = false;
          const details = Object.values(err.details || {}).join(' ');
          toast(details || err.message, 'err');
        }
      });

      document.addEventListener('keydown', onKey);
      document.body.appendChild(back);
      const first = $('input, textarea, select', back);
      if (first) first.focus();
    });
  }

  const confirmDialog = (title, message, confirmText = 'Confirm', danger = true) =>
    modal({
      title,
      confirmText,
      danger,
      bodyHtml: `<p style="margin:0">${esc(message)}</p>`,
      onConfirm: () => true,
    }).then(v => v === true);

  /* ==================================================================== auth */

  function showLogin(message) {
    state.admin = null;
    $('#app').hidden = true;
    $('#loginScreen').hidden = false;
    if (message) {
      const box = $('#loginError');
      box.textContent = message;
      box.classList.remove('hide');
    }
    $('#loginEmail').focus();
  }

  function showApp(admin) {
    state.admin = admin;
    $('#loginScreen').hidden = true;
    $('#app').hidden = false;

    $('#whoName').textContent = admin.name || admin.email;
    $('#whoRole').textContent = admin.role;
    $('#whoAvatar').textContent = (admin.name || admin.email).trim().charAt(0).toUpperCase();

    // A moderator has no business on the Team or Settings pages.
    document.querySelectorAll('[data-role="admin"]').forEach(el => {
      el.classList.toggle('hide', admin.role !== 'admin');
    });
    $('#envBadge').textContent = location.hostname === 'localhost'
      || location.hostname === '127.0.0.1' ? 'local' : 'live';
  }

  async function boot() {
    try {
      const { admin } = await api.get('/api/admin/session');
      if (!admin) return showLogin();
      showApp(admin);
      await route();
      refreshBadges();
    } catch (err) {
      showLogin('Could not reach the server. Try reloading.');
    }
  }

  async function refreshBadges() {
    if (!state.admin) return;
    try {
      const data = await api.get('/api/admin/overview');
      state.counts.pending = data.counts?.pending || 0;
      state.counts.openReports = data.openReports || 0;
    } catch { return; }

    const p = $('#pendingPill');
    p.textContent = group(state.counts.pending);
    p.classList.toggle('hide', !state.counts.pending);

    const r = $('#reportPill');
    r.textContent = group(state.counts.openReports);
    r.classList.toggle('hide', !state.counts.openReports);
  }

  /* ================================================================= router */

  const VIEWS = {
    overview:   { title: 'Overview',       render: viewOverview },
    listings:   { title: 'Listings',       render: viewListings },
    moderation: { title: 'Needs review',   render: viewModeration },
    members:    { title: 'Members',        render: viewMembers },
    reports:    { title: 'Reports',        render: viewReports },
    settings:   { title: 'Settings',       render: viewSettings, adminOnly: true },
    team:       { title: 'Team',           render: viewTeam,     adminOnly: true },
  };

  function currentView() {
    const name = (location.hash.replace(/^#\/?/, '') || 'overview').split('?')[0];
    const view = VIEWS[name] ? name : 'overview';
    // Silently fall back rather than showing a moderator a locked page.
    if (VIEWS[view].adminOnly && !isAdmin()) return 'overview';
    return view;
  }

  async function route() {
    if (!state.admin) return;
    state.view = currentView();

    $('#pageTitle').textContent = VIEWS[state.view].title;
    document.querySelectorAll('#nav a[data-view]').forEach(a => {
      a.classList.toggle('active', a.dataset.view === state.view);
    });
    document.body.classList.remove('nav-open');

    const host = $('#view');
    // Tagging the container makes "which view is showing, and has it finished
    // loading?" unambiguous for tests and for debugging in devtools.
    host.dataset.view = state.view;
    delete host.dataset.ready;
    host.innerHTML = '<div class="card"><div class="card-body">'
      + '<div class="skeleton" style="width:40%;margin-bottom:10px"></div>'
      + '<div class="skeleton" style="width:70%"></div></div></div>';

    try {
      await VIEWS[state.view].render(host);
      host.dataset.ready = '1';
    } catch (err) {
      host.dataset.ready = 'error';
      if (err.status === 401) return showLogin('Your session expired. Sign in again.');
      host.innerHTML = `<div class="card"><div class="card-body empty">
        <div class="big">⚠️</div><h3>Could not load this page</h3>
        <p>${esc(err.message)}</p></div></div>`;
    }
  }

  const go = view => { location.hash = `#/${view}`; };

  /* ============================================================ view: overview */

  async function viewOverview(host) {
    const d = await api.get('/api/admin/overview');
    const c = d.counts;

    state.counts.pending = c.pending;
    state.counts.openReports = d.openReports;
    const p = $('#pendingPill');
    p.textContent = group(c.pending);
    p.classList.toggle('hide', !c.pending);
    const rp = $('#reportPill');
    rp.textContent = group(d.openReports);
    rp.classList.toggle('hide', !d.openReports);

    host.innerHTML = `
      <div class="grid cols-4 mb">
        <div class="stat is-live">
          <div class="label">Live ads</div>
          <div class="value mono-num">${group(c.active)}</div>
          <div class="hint">of ${group(c.total)} total</div>
        </div>
        <div class="stat ${c.pending ? 'is-pending' : ''}">
          <div class="label">Awaiting review</div>
          <div class="value mono-num">${group(c.pending)}</div>
          <div class="hint">${c.pending ? 'needs a decision' : 'queue is clear'}</div>
        </div>
        <div class="stat is-info">
          <div class="label">Sold</div>
          <div class="value mono-num">${group(c.sold)}</div>
          <div class="hint">${group(c.rejected)} rejected</div>
        </div>
        <div class="stat ${d.openReports ? 'is-danger' : ''}">
          <div class="label">Open reports</div>
          <div class="value mono-num">${group(d.openReports)}</div>
          <div class="hint">${d.openReports ? 'reported by visitors' : 'nothing flagged'}</div>
        </div>
      </div>

      <div class="grid cols-2 mb">
        <div class="card">
          <div class="card-head">
            <h2>Ads published</h2>
            <span class="small muted">last 14 days</span>
          </div>
          <div class="card-body">${dailyChart(d.daily)}</div>
        </div>

        <div class="card">
          <div class="card-head"><h2>By category</h2>
            <span class="small muted">live ads</span></div>
          <div class="card-body">${breakdown(d.byCategory, 'No live ads yet.')}</div>
        </div>
      </div>

      <div class="grid cols-2">
        <div class="card">
          <div class="card-head">
            <h2>Newest listings</h2>
            <button class="btn btn-outline btn-sm" data-act="go" data-view="listings">See all</button>
          </div>
          <div class="card-body flush table-wrap">
            ${d.recentAds.length ? `
            <table>
              <thead><tr><th>Ad</th><th>Status</th><th class="right">Posted</th></tr></thead>
              <tbody>
                ${d.recentAds.map(a => `
                  <tr>
                    <td><a href="../ad.html?id=${encodeURIComponent(a.id)}"
                           target="_blank" rel="noopener">${esc(a.title)}</a></td>
                    <td>${statusBadge(a.status)}</td>
                    <td class="right small muted nowrap">${esc(ago(a.created_at))}</td>
                  </tr>`).join('')}
              </tbody>
            </table>` : `<div class="empty"><div class="big">📭</div><p>No ads yet.</p></div>`}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>Recent activity</h2></div>
          <div class="card-body">
            ${d.audit.length ? `<ul class="feed">${d.audit.map(a => `
              <li>
                <span class="act">${esc(humanAction(a.action))}</span>
                ${a.detail ? `<span class="muted">— ${esc(truncate(a.detail, 60))}</span>` : ''}
                <div class="when">${esc(a.actor_email || 'system')} · ${esc(ago(a.created_at))}</div>
              </li>`).join('')}</ul>`
              : `<div class="empty"><p class="muted">Nothing logged yet.</p></div>`}
          </div>
        </div>
      </div>
    `;
  }

  function dailyChart(rows) {
    const byDay = new Map(rows.map(r => [r.day, r.n]));
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      days.push({ key, n: byDay.get(key) || 0, label: d.getDate() });
    }
    const peak = Math.max(1, ...days.map(d => d.n));
    const total = days.reduce((a, d) => a + d.n, 0);

    return `
      <div class="bars">
        ${days.map(d => `
          <div class="bar-col" title="${esc(d.key)}: ${group(d.n)}">
            <div class="bar-fill ${d.n ? '' : 'zero'}"
                 style="height:${Math.max(3, Math.round((d.n / peak) * 100))}%"></div>
            <span class="bar-lab">${d.label}</span>
          </div>`).join('')}
      </div>
      <p class="small muted" style="margin:12px 0 0">
        ${plural(total, 'ad')} in the last two weeks &middot; busiest day ${group(peak)}
      </p>`;
  }

  function breakdown(rows, emptyText) {
    const max = Math.max(1, ...rows.map(r => r.n));
    const visible = rows.filter(r => r.n > 0);
    if (!visible.length) return `<p class="muted small" style="margin:0">${esc(emptyText)}</p>`;

    return `<div class="breakdown">${visible.map(r => `
      <div class="row">
        <span class="nm">${esc(r.name)}</span>
        <span class="n mono-num">${group(r.n)}</span>
        <span class="track"><span class="fill" style="width:${Math.round((r.n / max) * 100)}%"></span></span>
      </div>`).join('')}</div>`;
  }

  const ACTION_LABELS = {
    'ad.created': 'Ad published',
    'ad.updated.admin': 'Ad edited by admin',
    'ad.updated.owner': 'Ad edited by owner',
    'ad.deleted.admin': 'Ad deleted by admin',
    'ad.deleted.owner': 'Ad deleted by owner',
    'ad.approve': 'Ad approved',
    'ad.reject': 'Ad rejected',
    'ad.pending': 'Ad returned to review',
    'ad.sold': 'Ad marked sold',
    'ad.feature': 'Ad featured',
    'ad.unfeature': 'Ad unfeatured',
    'admin.created': 'Admin created',
    'admin.updated': 'Admin updated',
    'admin.deleted': 'Admin removed',
    'settings.updated': 'Settings changed',
    'report.created': 'Ad reported',
    'report.resolved': 'Report resolved',
    'report.dismissed': 'Report dismissed',
    'report.open': 'Report reopened',
    'login.success': 'Signed in',
    'login.failed': 'Failed sign-in',
  };
  const humanAction = a => ACTION_LABELS[a] || a;
  const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

  const statusBadge = status =>
    `<span class="badge ${esc(status)}">${esc(status)}</span>`;

  /* ============================================================ view: listings */

  const STATUS_TABS = [
    ['all', 'All'],
    ['active', 'Live'],
    ['pending', 'Awaiting review'],
    ['sold', 'Sold'],
    ['rejected', 'Rejected'],
  ];

  async function viewListings(host) {
    const f = state.listings;
    const qs = new URLSearchParams({ status: f.status, page: f.page, perPage: 25 });
    if (f.q) qs.set('q', f.q);
    if (f.cat) qs.set('cat', f.cat);

    const data = await api.get(`/api/admin/ads?${qs}`);

    host.innerHTML = `
      <div class="card mb">
        <div class="card-body">
          <div class="bar">
            <div class="grow">
              <input type="search" id="lq" placeholder="Search title, description, area…"
                     value="${esc(f.q)}">
            </div>
            <select id="lcat" style="width:auto">
              <option value="">All categories</option>
              ${PB_CATEGORIES.map(c => `
                <option value="${esc(c.id)}" ${f.cat === c.id ? 'selected' : ''}>${esc(c.name)}</option>
              `).join('')}
            </select>
            <button class="btn btn-outline" data-act="lsearch">Search</button>
            ${(f.q || f.cat) ? '<button class="btn btn-ghost" data-act="lclear">Clear</button>' : ''}
          </div>

          <div class="bar" style="margin-top:12px">
            ${STATUS_TABS.map(([v, label]) => `
              <button class="btn btn-sm ${f.status === v ? '' : 'btn-outline'}"
                      data-act="ltab" data-status="${v}">${esc(label)}</button>
            `).join('')}
            <span class="small muted" style="margin-left:auto">
              ${plural(data.total, 'ad')}
            </span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body flush table-wrap">
          ${data.ads.length ? `
          <table>
            <thead>
              <tr>
                <th>Ad</th><th>Price</th><th>Location</th>
                <th>Status</th><th class="right">Views</th><th class="right">Posted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${data.ads.map(adRow).join('')}</tbody>
          </table>` : `
            <div class="empty">
              <div class="big">🔍</div>
              <h3>No ads match</h3>
              <p>${f.q || f.cat ? 'Try clearing the filters.' : 'Nothing here yet.'}</p>
            </div>`}
        </div>
        ${data.pages > 1 ? `
        <div class="pager">
          <button class="btn btn-outline btn-sm" data-act="lpage" data-page="${data.page - 1}"
                  ${data.page <= 1 ? 'disabled' : ''}>← Previous</button>
          <span class="small muted">Page ${data.page} of ${data.pages}</span>
          <button class="btn btn-outline btn-sm" data-act="lpage" data-page="${data.page + 1}"
                  ${data.page >= data.pages ? 'disabled' : ''}>Next →</button>
        </div>` : ''}
      </div>
    `;
  }

  function adRow(ad) {
    const thumb = ad.photos && ad.photos.length
      ? `<img src="${esc(ad.photos[0])}" alt="" loading="lazy">`
      : `<span class="thumb">${esc(catEmoji(ad.cat))}</span>`;

    return `
      <tr>
        <td>
          <div class="ad-cell">
            ${thumb}
            <div style="min-width:0">
              <span class="t">${esc(ad.title)}</span>
              <span class="m">
                ${esc(ad.sub || '—')} · ${esc(ad.seller?.name || '')}
                ${ad.featured ? ' · <span class="badge featured">featured</span>' : ''}
              </span>
            </div>
          </div>
        </td>
        <td class="nowrap">${ad.kind === 'adoption' ? '<span class="badge">free</span>' : money(ad.price)}</td>
        <td class="nowrap small">${esc(ad.districtName || areaNameOf(ad))}</td>
        <td>${statusBadge(ad.status)}</td>
        <td class="right mono-num">${group(ad.views)}</td>
        <td class="right small muted nowrap">${esc(fmtDate(ad.created))}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" data-act="inspect" data-id="${esc(ad.id)}">Open</button>
        </td>
      </tr>`;
  }

  const areaNameOf = ad => `${ad.area || ''}`.trim() || '—';
  const catEmoji = id => (PB_CATEGORIES.find(c => c.id === id) || {}).emoji || '🐾';

  /* ========================================================== view: moderation */

  async function viewModeration(host) {
    const data = await api.get('/api/admin/ads?status=pending&perPage=50');

    host.innerHTML = `
      <div class="card">
        <div class="card-head">
          <h2>Awaiting review</h2>
          <span class="small muted">${plural(data.total, 'ad')} &middot; newest first</span>
        </div>
        <div class="card-body flush table-wrap">
          ${data.ads.length ? `
          <table>
            <thead>
              <tr><th>Ad</th><th>Price</th><th>Location</th><th class="muted">Auto review</th><th class="right">Posted</th><th></th></tr>
            </thead>
            <tbody>
              ${data.ads.map(ad => `
                <tr>
                  <td>
                    <div class="ad-cell">
                      <span class="thumb">${esc(catEmoji(ad.cat))}</span>
                      <div style="min-width:0">
                        <span class="t">${esc(ad.title)}</span>
                        <span class="m">${esc(ad.sub || '—')} · ${esc(ad.seller?.name || '')}</span>
                      </div>
                    </div>
                  </td>
                  <td class="nowrap">${ad.kind === 'adoption' ? 'Free' : money(ad.price)}</td>
                  <td class="nowrap small">${esc(ad.area || '—')}</td>
                  <td class="muted small nowrap" title="${esc(ad.autoReason || '')}">
                    ${ad.autoReason
                      ? `<span class="badge">${esc(ad.autoDecision || 'held')}</span> ${esc(ad.autoReason)}`
                      : ''}
                  </td>
                  <td class="right small muted nowrap">${esc(ago(ad.created))}</td>
                  <td class="actions">
                    <button class="btn btn-outline btn-sm" data-act="inspect" data-id="${esc(ad.id)}">Review</button>
                    <button class="btn btn-sm" data-act="approve" data-id="${esc(ad.id)}">Approve</button>
                    <button class="btn btn-danger-outline btn-sm" data-act="reject" data-id="${esc(ad.id)}">Reject</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>` : `
            <div class="empty">
              <div class="big">✅</div>
              <h3>The queue is clear</h3>
              <p>Nothing is waiting for review.</p>
            </div>`}
        </div>
      </div>

      <p class="small muted mt">
        New ads go live immediately while <b>Auto-approve</b> is on.
        Turn it off in <a href="#/settings">Settings</a> to send every new ad here first.
      </p>
    `;
  }

  /* ============================================================= view: reports */

  async function viewReports(host) {
    const status = state.reports.status;
    const data = await api.get(`/api/admin/reports?status=${encodeURIComponent(status)}`);

    host.innerHTML = `
      <div class="card">
        <div class="card-head">
          <h2>Reported ads</h2>
          <div class="bar">
            ${['open', 'resolved', 'dismissed', 'all'].map(s => `
              <button class="btn btn-sm ${status === s ? '' : 'btn-outline'}"
                      data-act="rtab" data-status="${s}">
                ${esc(s[0].toUpperCase() + s.slice(1))}
                ${s !== 'all' && data.summary[s] ? `(${group(data.summary[s])})` : ''}
              </button>`).join('')}
          </div>
        </div>
        <div class="card-body flush table-wrap">
          ${data.reports.length ? `
          <table>
            <thead>
              <tr><th>Ad</th><th>Reason</th><th>Reported</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              ${data.reports.map(r => `
                <tr>
                  <td>
                    <div style="min-width:180px">
                      <a href="../ad.html?id=${encodeURIComponent(r.ad_id)}"
                         target="_blank" rel="noopener">${esc(r.ad_title || '(deleted ad)')}</a>
                      ${r.ad_status ? `<div class="small muted">${statusBadge(r.ad_status)}</div>` : ''}
                    </div>
                  </td>
                  <td>
                    <div class="small">${esc(r.reason)}</div>
                    ${r.note ? `<div class="small muted">${esc(truncate(r.note, 90))}</div>` : ''}
                  </td>
                  <td class="small muted nowrap">${esc(ago(r.created_at))}</td>
                  <td><span class="badge ${esc(r.status)}">${esc(r.status)}</span></td>
                  <td class="actions">
                    <button class="btn btn-outline btn-sm" data-act="inspect" data-id="${esc(r.ad_id)}">Open ad</button>
                    ${r.status !== 'resolved'
                      ? `<button class="btn btn-sm" data-act="rstatus" data-id="${esc(r.id)}" data-status="resolved">Resolve</button>` : ''}
                    ${r.status !== 'dismissed'
                      ? `<button class="btn btn-ghost btn-sm" data-act="rstatus" data-id="${esc(r.id)}" data-status="dismissed">Dismiss</button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>` : `
            <div class="empty">
              <div class="big">🚩</div>
              <h3>No ${esc(status === 'all' ? '' : status)} reports</h3>
              <p>Visitors can flag an ad from its page.</p>
            </div>`}
        </div>
      </div>
    `;
  }

  /* ============================================================ view: settings */

  const SETTING_FIELDS = [
    { key: 'site_name', label: 'Site name', type: 'text',
      hint: 'Used in the header and page titles.' },
    { key: 'contact_email', label: 'Contact email', type: 'email',
      hint: 'Shown to visitors who need to reach you.' },
    { key: 'listings_per_page', label: 'Listings per page', type: 'number',
      hint: 'How many ads appear on each results page (4–48).' },
    { key: 'post_limit', label: 'Ads per visitor per hour', type: 'number',
      hint: 'Rate limit on posting. 10 is a sensible default.' },
    { key: 'signup_limit', label: 'Sign-ups per address per hour', type: 'number',
      hint: 'Rate limit on new accounts. 10 is a sensible default.' },
    { key: 'posting_enabled', label: 'Allow new ads', type: 'bool',
      hint: 'Turn off to pause posting site-wide without losing the page.' },
    { key: 'auto_approve', label: 'Auto-approve new ads', type: 'bool',
      hint: 'On: ads go live instantly. Off: they wait in Needs review.' },
    { key: 'auto_moderation', label: 'Automated ad review', type: 'bool',
      hint: 'On: every new ad is screened automatically before it reaches the queue — ' +
            'obvious spam and off-site attempts are held or rejected. Off: ads skip straight to the queue.' },
    { key: 'auto_reject', label: 'Auto-reject clear spam', type: 'bool',
      hint: 'When auto-review is on: obvious fraud/spam is rejected at once. Off: it is held ' +
            'for a moderator instead of rejected.' },
  ];

  async function viewSettings(host) {
    const { settings, defaults } = await api.get('/api/admin/settings');

    host.innerHTML = `
      <form class="card" id="settingsForm" style="max-width:620px">
        <div class="card-head"><h2>Site settings</h2></div>
        <div class="card-body">
          ${SETTING_FIELDS.map(f => {
            const value = settings[f.key] ?? defaults[f.key] ?? '';
            if (f.type === 'bool') {
              return `
                <div class="field">
                  <label class="switch">
                    <input type="checkbox" name="${esc(f.key)}" ${value === '1' ? 'checked' : ''}>
                    <span class="txt"><b>${esc(f.label)}</b><span>${esc(f.hint)}</span></span>
                  </label>
                </div>`;
            }
            return `
              <div class="field">
                <label for="set-${esc(f.key)}">${esc(f.label)}</label>
                <input type="${esc(f.type)}" id="set-${esc(f.key)}" name="${esc(f.key)}"
                       value="${esc(value)}"
                       ${f.type === 'number' ? 'min="1" max="999"' : ''}>
                <div class="hint">${esc(f.hint)}</div>
              </div>`;
          }).join('')}
        </div>
        <div class="card-head" style="border-top:1px solid var(--line);border-bottom:0">
          <button class="btn" type="submit" id="saveSettings">Save settings</button>
          <span class="small muted">Changes take effect within a minute.</span>
        </div>
      </form>
    `;

    $('#settingsForm').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = $('#saveSettings');
      btn.disabled = true;

      const payload = {};
      for (const f of SETTING_FIELDS) {
        const el = e.target.elements[f.key];
        if (!el) continue;
        payload[f.key] = f.type === 'bool' ? el.checked : el.value;
      }

      try {
        await api.put('/api/admin/settings', payload);
        toast('Settings saved');
      } catch (err) {
        const fields = Object.values(err.details || {}).join(' ');
        toast(fields || err.message, 'err');
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ================================================================= view: team */

  async function viewTeam(host) {
    const { admins } = await api.get('/api/admin/admins');

    host.innerHTML = `
      <div class="card">
        <div class="card-head">
          <h2>Admin accounts</h2>
          <button class="btn btn-sm" data-act="newadmin">+ Add admin</button>
        </div>
        <div class="card-body flush table-wrap">
          <table>
            <thead>
              <tr><th>Person</th><th>Role</th><th>Status</th>
                  <th class="right">Last sign-in</th><th></th></tr>
            </thead>
            <tbody>
              ${admins.map(a => `
                <tr>
                  <td>
                    <div class="ad-cell">
                      <span class="thumb" style="border-radius:50%">${esc((a.name || a.email).charAt(0).toUpperCase())}</span>
                      <div style="min-width:0">
                        <span class="t">${esc(a.name || '—')}</span>
                        <span class="m">${esc(a.email)}</span>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge ${a.role === 'admin' ? 'active' : ''}">${esc(a.role)}</span></td>
                  <td>${a.is_active
                        ? '<span class="badge active">active</span>'
                        : '<span class="badge rejected">disabled</span>'}</td>
                  <td class="right small muted nowrap">${esc(a.last_login_at ? ago(a.last_login_at) : 'never')}</td>
                  <td class="actions">
                    <button class="btn btn-outline btn-sm" data-act="editadmin"
                            data-id="${esc(a.id)}" data-email="${esc(a.email)}"
                            data-name="${esc(a.name || '')}" data-role="${esc(a.role)}"
                            data-active="${a.is_active ? '1' : '0'}">Edit</button>
                    ${a.id === (state.admin && state.admin.id)
                      ? '<span class="small muted nowrap">You</span>'
                      : `<button class="btn btn-danger-outline btn-sm" data-act="removeadmin"
                           data-id="${esc(a.id)}" data-email="${esc(a.email)}">Remove</button>`}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card mt" style="max-width:620px">
        <div class="card-head"><h2>About roles</h2></div>
        <div class="card-body">
          <dl class="dl">
            <dt>Admin</dt><dd class="muted">Everything, including settings, team management and featuring ads.</dd>
            <dt>Moderator</dt><dd class="muted">Can approve, reject, edit and delete ads, and work the reports queue.</dd>
          </dl>
        </div>
      </div>
    `;
  }

  /* ============================================================ view: members */

  const MEMBER_TABS = [
    ['all', 'Everyone'],
    ['active', 'Active'],
    ['verified', 'Verified'],
    ['disabled', 'Suspended'],
  ];

  async function viewMembers(host) {
    const f = state.members;
    const qs = new URLSearchParams({ filter: f.filter, page: f.page, perPage: 25 });
    if (f.q) qs.set('q', f.q);

    const data = await api.get(`/api/admin/users?${qs}`);

    host.innerHTML = `
      <div class="card mb">
        <div class="card-body">
          <div class="bar">
            <div class="grow">
              <input type="search" id="mq" placeholder="Search name, phone or email…"
                     value="${esc(f.q)}">
            </div>
            <button class="btn btn-outline" data-act="msearch">Search</button>
            ${f.q ? '<button class="btn btn-ghost" data-act="mclear">Clear</button>' : ''}
          </div>

          <div class="bar" style="margin-top:12px">
            ${MEMBER_TABS.map(([v, label]) => `
              <button class="btn btn-sm ${f.filter === v ? '' : 'btn-outline'}"
                      data-act="mtab" data-filter="${v}">${esc(label)}</button>
            `).join('')}
            <span class="small muted" style="margin-left:auto">
              ${plural(data.total, 'member')}
            </span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body flush table-wrap">
          ${data.users.length ? `
          <table>
            <thead>
              <tr>
                <th>Member</th><th>Area</th><th class="right">Live / total</th>
                <th>Status</th><th class="right">Joined</th>
                <th class="right">Last sign-in</th><th></th>
              </tr>
            </thead>
            <tbody>${data.users.map(memberRow).join('')}</tbody>
          </table>` : `
            <div class="empty">
              <div class="big">🧑</div>
              <h3>No members match</h3>
              <p>${f.q ? 'Try a different search.' : 'Nobody is listed yet.'}</p>
            </div>`}
        </div>
        ${data.pages > 1 ? `
        <div class="pager">
          <button class="btn btn-outline btn-sm" data-act="mpage" data-page="${data.page - 1}"
                  ${data.page <= 1 ? 'disabled' : ''}>← Previous</button>
          <span class="small muted">Page ${data.page} of ${data.pages}</span>
          <button class="btn btn-outline btn-sm" data-act="mpage" data-page="${data.page + 1}"
                  ${data.page >= data.pages ? 'disabled' : ''}>Next →</button>
        </div>` : ''}
      </div>
    `;
  }

  function memberRow(m) {
    const initial = (m.name || '?').trim().charAt(0).toUpperCase();

    return `
      <tr>
        <td>
          <div class="ad-cell">
            <span class="thumb" style="border-radius:50%">${esc(initial)}</span>
            <div style="min-width:0">
              <span class="t">${esc(m.name)}</span>
              <span class="m mono">${esc(m.phone)}${m.email ? ' · ' + esc(m.email) : ''}</span>
            </div>
          </div>
        </td>
        <td class="nowrap small">${esc(m.area || '—')}</td>
        <td class="right mono-num">${group(m.activeAds)}<span class="muted"> / ${group(m.ads)}</span></td>
        <td class="nowrap">
          ${m.verified ? '<span class="badge active">verified</span> ' : ''}
          ${m.active ? '' : '<span class="badge rejected">suspended</span>'}
          ${m.verified || !m.active ? '' : '<span class="badge">member</span>'}
        </td>
        <td class="right small muted nowrap">${esc(fmtDate(m.joined))}</td>
        <td class="right small muted nowrap">${esc(m.lastLogin ? ago(m.lastLogin) : 'never')}</td>
        <td class="actions">
          <button class="btn btn-outline btn-sm" data-act="openmember"
                  data-id="${esc(m.id)}">Open</button>
        </td>
      </tr>`;
  }

  /* ================================================== action: member panel */

  async function openMemberPanel(id) {
    const { user: m, ads } = await api.get(`/api/admin/users/${encodeURIComponent(id)}`);

    // Read-only: "Open ad" buttons here would stack a second dialog on top of
    // this one, which is exactly what the moderation flow avoids.
    const adList = ads.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>Ad</th><th>Price</th><th>Status</th><th class="right">Views</th></tr></thead>
        <tbody>${ads.slice(0, 12).map(a => `
          <tr>
            <td><span class="t">${esc(a.title)}</span></td>
            <td class="nowrap">${a.kind === 'adoption'
              ? '<span class="badge">free</span>' : money(a.price)}</td>
            <td>${statusBadge(a.status)}</td>
            <td class="right mono-num">${group(a.views)}</td>
          </tr>`).join('')}</tbody>
      </table></div>
      ${ads.length > 12 ? `<p class="small muted">…and ${group(ads.length - 12)} more.</p>` : ''}
    ` : '<p class="small muted">Nothing posted yet.</p>';

    const body = `
      <div class="bar mb">
        <span class="avatar" style="width:50px;height:50px;font-size:20px">
          ${esc((m.name || '?').trim().charAt(0).toUpperCase())}</span>
        <div style="min-width:0">
          <h3 style="margin:0">${esc(m.name)}</h3>
          <p class="small muted mono" style="margin:2px 0 0">${esc(m.phone)}</p>
        </div>
      </div>

      <div class="bar mb">
        ${m.verified
          ? '<span class="badge active">verified</span>'
          : '<span class="badge">unverified</span>'}
        ${m.active
          ? '<span class="badge active">active</span>'
          : '<span class="badge rejected">suspended</span>'}
        <span class="badge">${group(m.activeAds)} live of ${plural(m.ads, 'listing')}</span>
      </div>

      <dl class="dl mb">
        <dt>Email</dt><dd>${esc(m.email || '—')}</dd>
        <dt>Area</dt><dd>${esc(m.area || '—')}</dd>
        <dt>Joined</dt><dd>${esc(fmtDate(m.joined, true))}</dd>
        <dt>Last sign-in</dt><dd>${esc(m.lastLogin ? fmtDate(m.lastLogin, true) : 'never')}</dd>
      </dl>

      ${m.bio ? `<p class="small" style="white-space:pre-wrap">${esc(m.bio)}</p>` : ''}

      <h4 class="mt">Their listings</h4>
      ${adList}

      <details class="mt">
        <summary class="small muted">Technical details</summary>
        <dl class="dl mt">
          <dt>Member ID</dt><dd class="mono">${esc(m.id)}</dd>
          <dt>Division</dt><dd class="mono">${esc(m.loc || '—')}</dd>
        </dl>
      </details>
    `;

    const actions = [{
      act: m.verified ? 'unverify' : 'verify',
      label: m.verified ? 'Remove badge' : 'Verify',
      cls: 'btn-outline',
    }];

    // Taking an account off the site is an administrator's call, so a
    // moderator is not offered the buttons at all.
    if (isAdmin()) {
      actions.push({
        act: m.active ? 'deactivate' : 'activate',
        label: m.active ? 'Suspend' : 'Reactivate',
        cls: 'btn-outline',
      });
      actions.push({ act: 'resetPassword', label: 'Reset password', cls: 'btn-outline' });
      actions.push({ act: 'delete', label: 'Delete', cls: 'btn-danger' });
    }

    const result = await modal({
      title: 'Member',
      confirmText: 'Close',
      cancelText: null,
      actions,
      bodyHtml: body,
      onConfirm: () => null,
    });

    if (result && result.action) {
      await memberAction(id, result.action, m);
      refreshBadges();
      await route();
    }
  }

  /**
   * Runs a member action. Any dialog it needs is opened *after* the caller has
   * closed its own, so dialogs never stack.
   */
  async function memberAction(id, action, m) {
    const path = `/api/admin/users/${encodeURIComponent(id)}`;

    if (action === 'delete') {
      const yes = await confirmDialog(
        'Delete this member?',
        `${m.name} and their ${m.ads} listing(s) will be removed permanently, `
        + 'along with any photos. This cannot be undone.',
        'Delete member',
      );
      if (!yes) return false;
      await api.delete(path);
      toast('Member deleted');
      return true;
    }

    if (action === 'deactivate') {
      const yes = await confirmDialog(
        'Suspend this member?',
        `${m.name} will be signed out at once and cannot sign back in. `
        + 'Their listings stay on the site until you remove them.',
        'Suspend member',
      );
      if (!yes) return false;
    }

    const res = await api.patch(path, { action });

    if (action === 'resetPassword') {
      // There is no email delivery, so the password is shown once and handed
      // over out of band. Nothing stores the plain text.
      await modal({
        title: 'New password issued',
        confirmText: 'Done',
        cancelText: null,
        onConfirm: () => null,
        bodyHtml: `
          <p class="small muted" style="margin-top:0">
            Read this to ${esc(m.name)}. It is shown once and is not stored,
            so if it is lost you must issue another.
          </p>
          <input type="text" readonly value="${esc(res.password)}"
                 style="font-family:ui-monospace,monospace;font-size:16px">`,
      });
      toast('Password reset — pass it on to the member');
      return true;
    }

    toast({
      verify: 'Member verified',
      unverify: 'Verification removed',
      activate: 'Member reactivated',
      deactivate: 'Member suspended',
    }[action] || 'Member updated');
    return true;
  }

  /* ================================================== action: ad detail panel */

  async function openAdPanel(id) {
    const { ad } = await api.get(`/api/admin/ads/${encodeURIComponent(id)}`);

    const photo = ad.photos && ad.photos.length
      ? `<img src="${esc(ad.photos[0])}" alt="" style="width:100%;max-height:230px;object-fit:cover;border-radius:8px;margin-bottom:14px">`
      : '';

    const body = `
      ${photo}
      <h3 style="margin-bottom:4px">${esc(ad.title)}</h3>
      <p class="small muted" style="margin:0 0 14px">
        ${esc(ad.sub || '—')} · ${esc(ad.kind)} · posted ${esc(fmtDate(ad.created, true))}
      </p>

      <div class="bar mb">
        ${statusBadge(ad.status)}
        ${ad.featured ? '<span class="badge featured">featured</span>' : ''}
        <span class="badge">${group(ad.views)} views</span>
      </div>

      <dl class="dl mb">
        <dt>Price</dt><dd>${ad.kind === 'adoption' ? 'Free to a good home'
            : money(ad.price) + (ad.negotiable ? ' (negotiable)' : '')}</dd>
        <dt>Location</dt><dd>${esc(ad.area || '—')}</dd>
        <dt>Age / sex</dt><dd>${esc(ad.age || '—')}${ad.gender ? ' · ' + esc(ad.gender) : ''}</dd>
        <dt>Vaccinated</dt><dd>${ad.vaccinated ? 'Yes' : 'Not stated'}</dd>
        <dt>Contact</dt><dd><b>${esc(ad.seller?.name || '—')}</b><br>${esc(ad.phone || '')}
            ${ad.email ? '<br>' + esc(ad.email) : ''}</dd>
      </dl>

      ${ad.rejectionReason ? `<div class="field err">Previously rejected: ${esc(ad.rejectionReason)}</div>` : ''}

      ${ad.autoReason ? `<div class="field" title="${esc(ad.autoReason)}">Reviewed automatically: <b>${esc(ad.autoDecision || 'held')}</b> — ${esc(ad.autoReason)}</div>` : ''}

      <div style="white-space:pre-wrap;line-height:1.6">${esc(ad.desc || '')}</div>

      ${ad.photos && ad.photos.length > 1 ? `
        <div class="bar mt">${ad.photos.slice(1).map(p =>
          `<img src="${esc(p)}" alt="" style="width:68px;height:68px;object-fit:cover;border-radius:7px">`
        ).join('')}</div>` : ''}

      <details class="mt">
        <summary class="small muted">Technical details</summary>
        <dl class="dl mt">
          <dt>Ad ID</dt><dd class="mono">${esc(ad.id)}</dd>
          <dt>Category</dt><dd class="mono">${esc(ad.cat)}</dd>
          <dt>Auto review</dt><dd>${esc(ad.autoDecision || 'approved')}<br><span class="small muted">${esc(ad.autoReason || 'no automated reason')}</span></dd>
          <dt>Updated</dt><dd>${esc(fmtDate(ad.updated, true))}</dd>
        </dl>
      </details>
    `;

    const actions = [];
    if (ad.status !== 'active') actions.push({ act: 'approve', label: 'Approve', cls: 'btn' });
    if (ad.status !== 'rejected') actions.push({ act: 'reject', label: 'Reject', cls: 'btn-danger-outline' });
    if (ad.status !== 'sold') actions.push({ act: 'sold', label: 'Mark sold', cls: 'btn-outline' });
    actions.push({
      act: ad.featured ? 'unfeature' : 'feature',
      label: ad.featured ? 'Unfeature' : 'Feature',
      cls: 'btn-outline',
    });
    actions.push({ act: 'delete', label: 'Delete', cls: 'btn-danger' });

    // Resolves with { action } when a moderation button is used, null on close.
    const result = await modal({
      title: 'Review ad',
      confirmText: 'Close',
      cancelText: null,
      actions,
      bodyHtml: body,
      onConfirm: () => null,
    });

    if (result && result.action) {
      await moderate(id, result.action, ad);
      refreshBadges();
      await route();
    }
  }

  /* =========================================================== the moderator */

  /**
   * Runs a moderation action. Any confirmation dialog it needs is opened
   * *after* the caller has closed its own, so dialogs never stack.
   */
  async function moderate(id, action, ad) {
    if (action === 'delete') {
      const yes = await confirmDialog(
        'Delete this ad?',
        `"${ad.title}" will be removed permanently, along with its photos. This cannot be undone.`,
        'Delete ad',
      );
      if (!yes) return false;
      await api.delete(`/api/admin/ads/${encodeURIComponent(id)}`);
      toast('Ad deleted');
      return true;
    }

    if (action === 'reject') {
      const reason = await modal({
        title: 'Reject this ad',
        confirmText: 'Reject ad',
        danger: true,
        bodyHtml: `
          <p class="small muted" style="margin-top:0">
            The seller sees this reason. Be specific so they can fix it.
          </p>
          <input type="text" id="rejectReason" maxlength="300"
                 placeholder="e.g. Photos are stock images, not the actual animal">`,
        onConfirm: back => $('#rejectReason', back).value.trim(),
      });
      if (reason === null) return false;
      await api.patch(`/api/admin/ads/${encodeURIComponent(id)}`,
                      { action: 'reject', reason });
      toast('Ad rejected — the seller will see your reason');
      return true;
    }

    await api.patch(`/api/admin/ads/${encodeURIComponent(id)}`, { action });
    toast({
      approve: 'Ad approved and live',
      sold: 'Marked as sold',
      feature: 'Ad featured',
      unfeature: 'No longer featured',
      pending: 'Returned to the review queue',
    }[action] || 'Ad updated');
    return true;
  }

  /* =================================================== action: admin accounts */

  async function openAdminForm(existing) {
    const isNew = !existing;
    const fields = `
      <div class="field">
        <label for="afEmail">Email</label>
        <input type="email" id="afEmail" value="${esc(existing?.email || '')}"
               ${isNew ? '' : 'disabled'} autocomplete="off">
      </div>
      <div class="field">
        <label for="afName">Name</label>
        <input type="text" id="afName" value="${esc(existing?.name || '')}" autocomplete="off">
      </div>
      <div class="field">
        <label for="afPass">${isNew ? 'Password' : 'New password (leave blank to keep)'}</label>
        <input type="password" id="afPass" autocomplete="new-password"
               placeholder="At least 10 characters">
      </div>
      <div class="field">
        <label for="afRole">Role</label>
        <select id="afRole">
          <option value="admin" ${existing?.role === 'admin' ? 'selected' : ''}>Admin — full access</option>
          <option value="moderator" ${existing?.role === 'moderator' ? 'selected' : ''}>Moderator — listings and reports</option>
        </select>
      </div>
      ${isNew ? '' : `
      <div class="field">
        <label class="switch">
          <input type="checkbox" id="afActive" ${existing.active ? 'checked' : ''}>
          <span class="txt"><b>Account enabled</b>
            <span>Disabled accounts cannot sign in and lose their sessions.</span></span>
        </label>
      </div>`}
    `;

    return modal({
      title: isNew ? 'Add an admin' : 'Edit admin',
      confirmText: isNew ? 'Create account' : 'Save changes',
      bodyHtml: fields,
      onConfirm: async back => {
        const password = $('#afPass', back).value;
        const name = $('#afName', back).value.trim();
        const role = $('#afRole', back).value;

        if (isNew) {
          const email = $('#afEmail', back).value.trim();
          if (!password || password.length < 10) {
            throw new ApiError('Password must be at least 10 characters.');
          }
          await api.post('/api/admin/admins', { email, name, role, password });
          toast('Admin created');
          return true;
        }

        const patch = { name, role };
        if (password) patch.password = password;
        const activeEl = $('#afActive', back);
        if (activeEl) patch.is_active = activeEl.checked;

        await api.patch(`/api/admin/admins/${encodeURIComponent(existing.id)}`, patch);
        toast('Admin updated');
        return true;
      },
    });
  }

  /* =============================================================== delegation */

  document.addEventListener('click', async e => {
    // Modals own their buttons entirely — never double-handle them.
    if (e.target.closest('.modal-back')) return;

    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const id = el.dataset.id;

    try {
      switch (act) {
        case 'go':
          go(el.dataset.view);
          break;

        /* ---- listings ---- */
        case 'ltab':
          e.preventDefault();
          state.listings.status = el.dataset.status;
          state.listings.page = 1;
          route();
          break;

        case 'lpage': {
          const page = Number(el.dataset.page);
          if (page > 0) { state.listings.page = page; route(); }
          break;
        }

        case 'lsearch':
          state.listings.q = $('#lq').value.trim();
          state.listings.cat = $('#lcat').value;
          state.listings.page = 1;
          route();
          break;

        case 'lclear':
          state.listings.q = '';
          state.listings.cat = '';
          state.listings.page = 1;
          route();
          break;

        /* ---- shared ---- */
        case 'inspect':
          await openAdPanel(id);
          break;

        case 'approve':
          if (await moderate(id, 'approve')) { refreshBadges(); route(); }
          break;

        case 'reject':
          if (await moderate(id, 'reject')) { refreshBadges(); route(); }
          break;

        /* ---- members ---- */
        case 'mtab':
          state.members.filter = el.dataset.filter;
          state.members.page = 1;
          route();
          break;

        case 'mpage': {
          const page = Number(el.dataset.page);
          if (page > 0) { state.members.page = page; route(); }
          break;
        }

        case 'msearch':
          state.members.q = $('#mq').value.trim();
          state.members.page = 1;
          route();
          break;

        case 'mclear':
          state.members.q = '';
          state.members.page = 1;
          route();
          break;

        case 'openmember':
          await openMemberPanel(id);
          break;

        /* ---- reports ---- */
        case 'rtab':
          state.reports.status = el.dataset.status;
          route();
          break;

        case 'rstatus':
          await api.patch('/api/admin/reports',
                          { id, status: el.dataset.status });
          toast(`Report ${el.dataset.status}`);
          refreshBadges();
          route();
          break;

        /* ---- team ---- */
        case 'newadmin':
          if (await openAdminForm(null)) route();
          break;

        case 'editadmin': {
          const existing = {
            id,
            email: el.dataset.email,
            name: el.dataset.name,
            role: el.dataset.role,
            active: el.dataset.active === '1',
          };
          if (await openAdminForm(existing)) route();
          break;
        }

        case 'removeadmin': {
          const email = el.dataset.email;
          const msg =
            `Remove ${email}?\n` +
            `This signs them out and deletes their account. This cannot be undone.`;
          if (await confirmDialog('Remove admin account', msg, 'Remove', true)) {
            await api.delete(`/api/admin/admins/${encodeURIComponent(id)}`);
            toast(`Removed ${email}`, 'ok');
            route();
            refreshBadges();
          }
          break;
        }
      }
    } catch (err) {
      if (err.status === 401) return showLogin('Your session expired. Sign in again.');
      const details = Object.values(err.details || {}).join(' ');
      toast(details || err.message, 'err');
    }
  });

  /* ------------------------------------------------------------------ login */

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = $('#loginBtn');
    const errBox = $('#loginError');
    errBox.classList.add('hide');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';

    try {
      const { admin } = await api.post('/api/admin/session', {
        email: $('#loginEmail').value.trim(),
        password: $('#loginPassword').value,
      });
      $('#loginPassword').value = '';
      showApp(admin);
      if (!location.hash) go('overview');
      await route();
      // route() can call showLogin() if its first data fetch returns a
      // transient 401 (the session cookie is not guaranteed to be in flight
      // for that request yet). showLogin() also clears state.admin, so use the
      // local `admin` to re-assert the app and keep the login screen from
      // popping back onto the screen right after sign-in.
      if (admin) showApp(admin);
      refreshBadges();
      toast(`Welcome back, ${admin.name || admin.email}`);
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('hide');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    try { await api.delete('/api/admin/session'); } catch { /* sign out anyway */ }
    location.hash = '';
    showLogin();
    toast('Signed out', 'info');
  });

  $('#refreshBtn').addEventListener('click', () => { route(); refreshBadges(); });
  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));

  window.addEventListener('hashchange', route);

  // Enter in a search box should search, not submit a form.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;

    if (e.target.id === 'lq') {
      e.preventDefault();
      state.listings.q = e.target.value.trim();
      state.listings.cat = $('#lcat').value;
      state.listings.page = 1;
      route();
    } else if (e.target.id === 'mq') {
      e.preventDefault();
      state.members.q = e.target.value.trim();
      state.members.page = 1;
      route();
    }
  });

  /* ===================================================================== boot */

  // Categories drive the listings filter dropdown and the row thumbnails.
  // They come from the same taxonomy the public site uses.
  async function loadCategories() {
    try {
      const data = await (await fetch('/api/taxonomy')).json();
      PB_CATEGORIES = data.categories || [];
    } catch {
      PB_CATEGORIES = [];
    }
    if (!PB_CATEGORIES.length) {
      PB_CATEGORIES = [
        { id: 'dogs', name: 'Dogs', emoji: '🐕' },
        { id: 'cats', name: 'Cats', emoji: '🐈' },
        { id: 'birds', name: 'Birds', emoji: '🦜' },
        { id: 'fish', name: 'Fish', emoji: '🐠' },
      ];
    }
  }

  (async () => {
    await loadCategories();
    await boot();
  })();
})();
