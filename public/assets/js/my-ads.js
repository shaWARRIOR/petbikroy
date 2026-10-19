/* ==========================================================================
   PetBikroy — "My ads" management

   There are no accounts, so "my ads" means "ads this browser published":
   API.myAds() holds the id plus the one-time owner token that POST /api/ads
   returned. The token is what authorises editing and deleting, and it is the
   only copy — the server stores just its hash.

   Ads are re-fetched from the API on every load so the status shown here
   (live, in review, rejected, sold) is the real one, never a stale copy.
   ========================================================================== */

(() => {
  'use strict';

  const { $, $$, esc, icon } = UI;

  UI.mountChrome();
  $('#crumbs').innerHTML = UI.crumbs([
    { label: 'Home', href: 'index.html' },
    { label: 'My ads' },
  ]);

  let tab = 'all';
  let editing = null;     // id of the ad open in the inline editor
  let entries = [];       // [{ id, ad }] — ad is null when it has gone
  let loading = true;

  const STATUS_LABEL = {
    active: 'Live', sold: 'Sold', pending: 'In review', rejected: 'Rejected',
  };
  const NEEDS_ATTENTION = new Set(['pending', 'rejected']);

  /* -------------------------------------------------------------- payloads */

  /**
   * Rebuilds the full create/edit payload from a loaded ad.
   *
   * PUT replaces the whole record, so a partial edit is not an option.
   * `photos` is deliberately omitted: the API only touches stored photos when
   * that field is present, and this page holds image URLs, not storage keys —
   * sending them back would corrupt the gallery.
   */
  function toPayload(ad, changes) {
    return {
      categoryId: ad.cat,
      subcategory: ad.sub,
      kind: ad.kind || 'sale',
      title: ad.title,
      description: ad.desc || '',
      price: Number(ad.price) || 0,
      negotiable: !!ad.negotiable,
      locationId: ad.loc,
      area: ad.area || '',
      age: ad.age || '',
      gender: ad.gender || '',
      vaccinated: !!ad.vaccinated,
      condition: ad.condition || 'New',
      contactName: (ad.seller && ad.seller.name) || '',
      contactPhone: ad.phone || '',
      contactEmail: ad.email || '',
      ...(changes || {}),
    };
  }

  /* -------------------------------------------------------------- loading */

  async function load() {
    loading = true;
    await API.ready;

    const ids = API.myAds().map(e => e.id);

    // With no backend there is no server-side list to ask for, so fall back
    // to whatever this browser saved locally.
    if (!API.available) {
      for (const ad of PB.getUserAds()) if (!ids.includes(ad.id)) ids.push(ad.id);
    }

    let ads = [];
    try {
      ads = await API.getAdsByIds(ids);
    } catch {
      ads = [];
    }

    const byId = new Map(ads.map(a => [a.id, a]));
    entries = ids.map(id => ({ id, ad: byId.get(id) || null }));
    loading = false;
  }

  /* --------------------------------------------------------------- render */

  const visible = () => entries.filter(({ ad }) => {
    if (tab === 'all') return true;
    if (!ad) return false;                       // gone ads only show under "All"
    if (tab === 'active') return ad.status === 'active';
    if (tab === 'sold') return ad.status === 'sold';
    if (tab === 'review') return NEEDS_ATTENTION.has(ad.status);
    return true;
  });

  function tabCounts() {
    const live = entries.filter(e => e.ad && e.ad.status === 'active').length;
    const sold = entries.filter(e => e.ad && e.ad.status === 'sold').length;
    const review = entries.filter(e => e.ad && NEEDS_ATTENTION.has(e.ad.status)).length;
    return { all: entries.length, active: live, sold, review };
  }

  const statusPill = status =>
    `<span class="status-pill status-${esc(status)}">${esc(STATUS_LABEL[status] || status)}</span>`;

  function render() {
    $('#adsCount').textContent = entries.length === 1
      ? '1 posted by you' : `${entries.length} posted by you`;

    // Keep the tab labels honest.
    const n = tabCounts();
    $$('#tabs button').forEach(b => {
      const base = { all: 'All mine', active: 'Live', sold: 'Sold', review: 'Needs attention' }[b.dataset.tab];
      if (!base) return;
      const count = n[b.dataset.tab] || 0;
      b.textContent = count ? `${base} (${count})` : base;
      b.classList.toggle('is-active', b.dataset.tab === tab);
    });

    const host = $('#tableHost');

    if (loading) {
      host.innerHTML = `<div class="card table-wrap"><table class="data"><tbody>
        ${Array.from({ length: 3 }, () =>
          '<tr><td><div class="skeleton" style="height:18px;width:70%"></div></td>'
          + '<td><div class="skeleton" style="height:18px"></div></td>'
          + '<td><div class="skeleton" style="height:18px"></div></td></tr>').join('')}
      </tbody></table></div>`;
      return;
    }

    const list = visible();

    if (!list.length) {
      host.innerHTML = UI.emptyState(
        tab === 'all'
          ? {
              emoji: '📝',
              title: 'You have not posted anything yet',
              text: 'Posting is free. Ads with good photos sell a lot faster.',
              action: { href: 'post.html', label: 'Post your first ad' },
            }
          : {
              emoji: '✅',
              title: tab === 'review' ? 'Nothing needs your attention' : `No ${tab} ads`,
              text: tab === 'review'
                ? 'Ads you post will appear here if a moderator asks for changes.'
                : 'Try another tab, or post something new.',
              action: { href: 'post.html', label: 'Post an ad' },
            }
      );
      return;
    }

    host.innerHTML = `<div class="card table-wrap">
      <table class="data">
        <thead><tr>
          <th>Ad</th><th>Category</th><th>Price</th><th>Location</th>
          <th>Views</th><th>Status</th><th>Posted</th><th></th>
        </tr></thead>
        <tbody>${list.map(rowHtml).join('')}</tbody>
      </table>
    </div>`;
  }

  function rowHtml({ id, ad }) {
    /* The ad has gone from the server — most likely deleted by a moderator.
       Offer to tidy up rather than showing a broken row forever. */
    if (!ad) {
      return `<tr>
        <td colspan="6" class="small muted">
          This ad is no longer on PetBikroy — it was removed or deleted.
        </td>
        <td colspan="2" style="text-align:right">
          <button class="btn btn-ghost btn-sm" data-forget="${esc(id)}">Remove from this list</button>
        </td>
      </tr>`;
    }

    const p = PB.formatPrice(ad.price, ad.negotiable);
    const open = editing === id;

    const notice = ad.status === 'rejected' && ad.rejectionReason
      ? `<tr class="notice-row"><td colspan="8" style="background:#fdeaea">
           <strong class="small">Needs changes:</strong>
           <span class="small">${esc(ad.rejectionReason)}</span>
           <span class="tiny muted"> — edit the ad and it goes back to the review queue.</span>
         </td></tr>`
      : ad.status === 'pending'
        ? `<tr class="notice-row"><td colspan="8" style="background:#fdf5e4">
             <span class="small">Waiting for a moderator to review this ad.</span>
           </td></tr>`
        : '';

    const editor = !open ? '' : `
      <tr class="editor-row" data-editor="${esc(id)}">
        <td colspan="8" style="background:#fbfcfc">
          <div style="max-width:640px">
            <div class="field">
              <label class="req">Title</label>
              <input class="input" data-edit="title" value="${esc(ad.title)}" maxlength="100">
            </div>
            <div class="field-row">
              <div class="field">
                <label>Price (${esc(PB.SITE.currency)})</label>
                <input class="input" type="number" min="0" data-edit="price"
                       value="${Number(ad.price) || 0}"${ad.kind === 'adoption' ? ' disabled' : ''}>
                ${ad.kind === 'adoption' ? '<div class="tiny muted">Adoptions are always free.</div>' : ''}
              </div>
              <div class="field">
                <label>Availability</label>
                <select class="select" data-edit="status">
                  <option value="active"${ad.status === 'active' ? ' selected' : ''}>Available</option>
                  <option value="sold"${ad.status === 'sold' ? ' selected' : ''}>Sold / given away</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>Description</label>
              <textarea class="textarea" data-edit="desc"
                        style="min-height:100px">${esc(ad.desc || '')}</textarea>
            </div>
            <div class="row gap-8">
              <button class="btn btn-primary btn-sm" data-save="${esc(id)}">Save changes</button>
              <button class="btn btn-ghost btn-sm" data-cancel="1">Cancel</button>
            </div>
          </div>
        </td>
      </tr>`;

    return `${notice}<tr>
      <td>
        <a class="tbl-ad" href="ad.html?id=${encodeURIComponent(id)}">
          <img src="${PB.adCover(ad)}" alt="">
          <span class="t">${esc(ad.title)}</span>
        </a>
      </td>
      <td class="small">${PB.catEmoji(ad.cat)} ${esc(PB.catName(ad.cat))}
        <div class="tiny muted">${esc(ad.sub || '')}</div></td>
      <td class="nowrap strong">${p.free ? 'Free' : PB.SITE.currency + PB.group(ad.price)}</td>
      <td class="small nowrap">${esc(ad.area || '')}
        <div class="tiny muted">${esc(PB.locName(ad.loc))}</div></td>
      <td class="small">${PB.group(ad.views || 0)}</td>
      <td>${statusPill(ad.status)}</td>
      <td class="small nowrap">${esc(PB.formatDate(ad.created))}
        <div class="tiny muted">${esc(PB.timeAgo(ad.created))}</div></td>
      <td>
        <div class="row gap-8" style="justify-content:flex-end;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" data-toggle="${esc(id)}">
            ${ad.status === 'sold' ? 'Mark available' : 'Mark sold'}
          </button>
          <button class="btn btn-outline btn-sm" data-edit-btn="${esc(id)}">
            ${icon('edit', 14)} Edit
          </button>
          <button class="btn btn-danger btn-sm" data-del="${esc(id)}" aria-label="Delete ad">
            ${icon('trash', 14)}
          </button>
        </div>
      </td>
    </tr>${editor}`;
  }

  /* ---------------------------------------------------------------- actions */

  const find = id => (entries.find(e => e.id === id) || {}).ad || null;

  /** Runs an async action with a busy toast, surfacing API errors politely. */
  async function guard(fn, okMessage) {
    try {
      const result = await fn();
      if (okMessage) UI.toast(okMessage, 'ok');
      return result;
    } catch (err) {
      const details = Object.values(err.details || {}).join(' ');
      UI.toast(details || err.message || 'That did not work.', 'err');
      return null;
    }
  }

  async function toggleStatus(id) {
    const ad = find(id);
    if (!ad) return;

    const next = ad.status === 'sold' ? 'active' : 'sold';
    const done = await guard(
      () => API.updateAd(id, toPayload(ad, { status: next })),
      next === 'sold' ? 'Marked as sold' : 'Back up for sale',
    );
    if (done) {
      // Reflect the change straight away, then reconcile with the server.
      ad.status = (done.ad && done.ad.status) || next;
      render();
      await refresh();
    }
  }

  async function saveEdit(id) {
    const ad = find(id);
    if (!ad) return;

    const scope = $(`.editor-row[data-editor="${id}"]`);
    if (!scope) return;
    const val = k => scope.querySelector(`[data-edit="${k}"]`).value;

    const title = val('title').trim();
    if (title.length < 10) {
      UI.toast('The title needs at least 10 characters.', 'err');
      return;
    }
    const desc = val('desc').trim();
    if (desc.length < 30) {
      UI.toast('The description needs at least 30 characters.', 'err');
      return;
    }

    const wasRejected = ad.status === 'rejected';
    const done = await guard(() => API.updateAd(id, toPayload(ad, {
      title,
      description: desc,
      price: Number(val('price')) || 0,
      status: val('status'),
    })));

    if (!done) return;

    editing = null;
    const nowStatus = (done.ad && done.ad.status) || ad.status;
    UI.toast(
      wasRejected && nowStatus === 'pending'
        ? 'Thanks — your ad is back in the review queue.'
        : 'Ad updated',
      'ok',
    );
    render();
    await refresh();
  }

  async function remove(id) {
    const ad = find(id);
    const label = ad ? `“${ad.title}”` : 'this ad';
    if (!confirm(`Delete ${label}?\n\nThis cannot be undone.`)) return;

    const done = await guard(() => API.deleteAd(id), 'Ad deleted');
    if (!done) return;

    entries = entries.filter(e => e.id !== id);
    editing = null;
    render();
  }

  /** Re-reads every ad from the server so statuses are never stale. */
  async function refresh() {
    const ads = await API.getAdsByIds(entries.map(e => e.id));
    const byId = new Map(ads.map(a => [a.id, a]));
    entries = entries.map(e => ({ id: e.id, ad: byId.get(e.id) || e.ad }));
  }

  /* ----------------------------------------------------------------- events */

  $('#tableHost').addEventListener('click', async e => {
    const el = e.target.closest('[data-toggle],[data-edit-btn],[data-del],[data-save],[data-cancel],[data-forget]');
    if (!el) return;

    const d = el.dataset;
    if (el.disabled) return;
    el.disabled = true;

    try {
      if (d.toggle) await toggleStatus(d.toggle);
      else if (d.editBtn) {
        editing = editing === d.editBtn ? null : d.editBtn;
        render();
        if (editing) $(`.editor-row[data-editor="${editing}"]`)?.scrollIntoView({
          block: 'center', behavior: 'smooth',
        });
      } else if (d.del) await remove(d.del);
      else if (d.save) await saveEdit(d.save);
      else if (d.cancel) { editing = null; render(); }
      else if (d.forget) {
        API.forgetAd(d.forget);
        entries = entries.filter(x => x.id !== d.forget);
        render();
        UI.toast('Removed from this list', 'ok');
      }
    } finally {
      if (el.isConnected) el.disabled = false;
    }
  });

  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    editing = null;
    render();
  });

  /* ------------------------------------------------------------------- boot */

  (async () => {
    render();               // skeleton
    await load();
    render();
  })();
})();
