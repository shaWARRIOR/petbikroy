/* ==========================================================================
   PetBikroy — "My ads" management

   Listings belong to an account, so this page is simply "everything the
   signed-in member has posted": GET /api/me/ads returns their own list with
   the contact details and the moderator's note, which is exactly what the
   inline editor needs to send back.

   With no backend there is no account and no server list, so the page falls
   back to the ads this browser saved locally.
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
  let editing = null;      // id of the ad open in the inline editor
  let editPhotos = [];     // [{ url, file? }] — the gallery being edited
  let ads = [];            // every listing the member owns
  let loading = true;
  let loadError = null;    // set when the list could not be fetched
  let signedOut = false;
  let offline = false;
  let promotePrice = 0;   // last-quoted promotion price, for the button label

  const STATUS_LABEL = {
    active: 'Live', sold: 'Sold', pending: 'In review', rejected: 'Rejected',
  };
  const NEEDS_ATTENTION = new Set(['pending', 'rejected']);

  /* -------------------------------------------------------------- payloads */

  /**
   * Rebuilds the full create/edit payload from a loaded ad.
   *
   * PUT replaces the whole record, so a partial edit is not an option.
   * `photos` is added by the caller: the API only touches the stored gallery
   * when that field is present, which is how "mark sold" leaves it alone.
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
      // Server responses use `phone`; the offline catalogue stores `contactPhone`.
      contactPhone: ad.phone || ad.contactPhone || '',
      contactEmail: ad.email || ad.contactEmail || '',
      ...(changes || {}),
    };
  }

  /* --------------------------------------------------------------- photos */

  const MAX_MB = Math.round(Wizard.MAX_BYTES / 1024 / 1024);

  const readAsDataUrl = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
    reader.readAsDataURL(file);
  });

  /**
   * The gallery inside the open editor.
   *
   * New photos are previewed from the picked file and only uploaded when the
   * member saves, so cancelling an edit cannot leave objects in the bucket
   * that nothing points at.
   */
  function photoGridHtml() {
    if (!editPhotos.length) {
      return '<p class="tiny muted" style="margin:0">'
        + 'No photos yet — listings with a photo get far more replies.</p>';
    }

    return editPhotos.map((p, i) => `
      <div class="photo-item">
        <img src="${esc(p.url)}" alt="Photo ${i + 1}">
        ${i === 0
          ? '<span class="primary-flag">Cover</span>'
          : `<button type="button" class="make-cover" data-photo-cover="${i}">Make cover</button>`}
        <button type="button" class="rm" data-photo-rm="${i}"
                aria-label="Remove photo ${i + 1}">✕</button>
      </div>`).join('');
  }

  /** Rewrites just the grid, so unsaved text in the other fields survives. */
  function renderPhotoGrid() {
    if (!editing) return;
    const scope = $(`.editor-row[data-editor="${editing}"]`);
    if (!scope) return;

    const grid = scope.querySelector('[data-photo-grid]');
    const add = scope.querySelector('[data-add-photo]');
    if (grid) grid.innerHTML = photoGridHtml();
    if (add) add.disabled = editPhotos.length >= Wizard.MAX_PHOTOS;
  }

  async function addPhotos(fileList) {
    const target = editing;          // ignore the pick if the editor moved on
    const room = Wizard.MAX_PHOTOS - editPhotos.length;
    if (room <= 0) {
      UI.toast(`A listing can hold up to ${Wizard.MAX_PHOTOS} photos.`, 'err');
      return;
    }

    const accepted = [];
    for (const file of fileList) {
      if (accepted.length >= room) {
        UI.toast(`Only ${Wizard.MAX_PHOTOS} photos fit — the rest were skipped.`, 'err');
        break;
      }
      if (!Wizard.photoAccepted(file)) {
        UI.toast(`${file.name} is not a photo under ${MAX_MB} MB — skipped.`, 'err');
        continue;
      }
      accepted.push(file);
    }
    if (!accepted.length) return;

    let previews;
    try {
      previews = await Promise.all(accepted.map(readAsDataUrl));
    } catch (err) {
      UI.toast(err.message || 'That photo could not be read.', 'err');
      return;
    }

    if (editing !== target) return;
    previews.forEach((url, i) => editPhotos.push({ url, file: accepted[i] }));
    renderPhotoGrid();
  }

  /** Uploads whatever was picked in the editor. False when it failed. */
  async function uploadPending(pending) {
    try {
      const values = await API.uploadPhotos(pending.map(p => p.file));
      values.forEach((value, i) => {
        // Online the API answers with R2 keys; offline with data URLs.
        pending[i].url = offline ? value : Wizard.photoSrc(value);
        delete pending[i].file;
      });
      return true;
    } catch (err) {
      UI.toast(err.message || 'The photos could not be uploaded.', 'err');
      return false;
    }
  }

  /* -------------------------------------------------------------- loading */

  async function load() {
    loading = true;
    loadError = null;
    await API.ready;

    // A failed list must never leave the page stuck on the skeleton: flip
    // `loading` off and show an error with a retry instead, whatever the cause
    // (offline API, a server error, or a database that is not migrated).
    try {
      const result = await API.myAds();
      ads = result.ads || [];
      signedOut = result.signedOut === true;
      offline = result.offline === true;
    } catch (err) {
      loadError = (err && err.message) || 'Could not load your ads.';
    }
    loading = false;
  }

  /* --------------------------------------------------------------- render */

  const visible = () => ads.filter(ad => {
    if (tab === 'all') return true;
    if (tab === 'active') return ad.status === 'active';
    if (tab === 'sold') return ad.status === 'sold';
    if (tab === 'review') return NEEDS_ATTENTION.has(ad.status);
    return true;
  });

  function tabCounts() {
    return {
      all: ads.length,
      active: ads.filter(a => a.status === 'active').length,
      sold: ads.filter(a => a.status === 'sold').length,
      review: ads.filter(a => NEEDS_ATTENTION.has(a.status)).length,
    };
  }

  const statusPill = status =>
    `<span class="status-pill status-${esc(status)}">${esc(STATUS_LABEL[status] || status)}</span>`;

  function render() {
    const tabs = $('#tabs');
    tabs.classList.toggle('hide', signedOut);

    $('#adsCount').textContent = signedOut
      ? ''
      : (ads.length === 1 ? '1 posted by you' : `${ads.length} posted by you`);

    // Keep the tab labels honest.
    const n = tabCounts();
    $$('#tabs button').forEach(b => {
      const base = {
        all: 'All mine', active: 'Live', sold: 'Sold', review: 'Needs attention',
      }[b.dataset.tab];
      if (!base) return;
      const count = n[b.dataset.tab] || 0;
      b.textContent = count ? `${base} (${count})` : base;
      b.classList.toggle('is-active', b.dataset.tab === tab);
    });

    const host = $('#tableHost');

    if (signedOut) {
      host.innerHTML = `<div class="card" style="padding:26px;text-align:center;max-width:520px;margin:0 auto">
        <div style="font-size:40px">🔐</div>
        <h3 style="margin:8px 0">Sign in to manage your ads</h3>
        <p class="muted small" style="margin-bottom:16px">
          Your listings are tied to your PetBikroy account, so you need to sign
          in before you can edit, mark them sold or take them down.
        </p>
        <div class="row gap-8" style="justify-content:center">
          <a class="btn btn-primary" href="login.html?next=my-ads.html">Sign in</a>
          <a class="btn btn-outline" href="register.html?next=my-ads.html">Create an account</a>
        </div>
      </div>`;
      return;
    }

    if (loading) {
      host.innerHTML = `<div class="card table-wrap"><table class="data"><tbody>
        ${Array.from({ length: 3 }, () =>
          '<tr><td><div class="skeleton" style="height:18px;width:70%"></div></td>'
          + '<td><div class="skeleton" style="height:18px"></div></td>'
          + '<td><div class="skeleton" style="height:18px"></div></td></tr>').join('')}
      </tbody></table></div>`;
      return;
    }

    if (loadError) {
      host.innerHTML = `<div class="card" style="padding:26px;text-align:center;max-width:520px;margin:0 auto">
        <div style="font-size:40px">⚠️</div>
        <h3 style="margin:8px 0">We could not load your ads</h3>
        <p class="muted small" style="margin-bottom:16px">${esc(loadError)}</p>
        <button type="button" class="btn btn-primary" data-reload>Try again</button>
      </div>`;
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

  function rowHtml(ad) {
    const id = ad.id;
    const p = PB.formatPrice(ad.price, ad.negotiable);
    const open = editing === id;
    // Local ads cannot be sent to a server that is not there.
    const local = offline;

    const notice = ad.status === 'rejected' && ad.rejectionReason
      ? `<tr class="notice-row"><td colspan="8" style="background:#fdeaea">
           <strong class="small">Needs changes:</strong>
           <span class="small">${esc(ad.rejectionReason)}</span>
           ${ad.autoReason ? `<div class="tiny muted">Automated review: ${esc(ad.autoReason)}</div>` : ''}
           <span class="tiny muted"> — edit the ad and it goes back to the review queue.</span>
         </td></tr>`
      : (ad.status === 'pending' || ad.status === 'rejected')
        && ad.autoDecision && ad.autoReason
        ? `<tr class="notice-row"><td colspan="8" style="background:#fdf5e4">
             <strong class="small">Automated review ${esc(ad.autoDecision === 'rejected' ? 'rejected' : 'held')} this ad:</strong>
             <span class="small">${esc(ad.autoReason)}</span>
             <span class="tiny muted"> — a moderator will check it, or edit and resubmit.</span>
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
              <input class="input" data-edit="title" value="${esc(ad.title)}" maxlength="140">
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
                  <option value="active"${ad.status === 'active' || ad.status === 'rejected' || ad.status === 'pending' ? ' selected' : ''}>Available</option>
                  <option value="sold"${ad.status === 'sold' ? ' selected' : ''}>Sold / given away</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>Description</label>
              <textarea class="textarea" data-edit="desc"
                        style="min-height:100px">${esc(ad.desc || '')}</textarea>
            </div>
            <div class="field">
              <label>Photos</label>
              <div class="photo-grid" data-photo-grid>${photoGridHtml()}</div>
              <div class="row gap-8" style="margin-top:12px;align-items:center">
                <button type="button" class="btn btn-outline btn-sm" data-add-photo
                        ${editPhotos.length >= Wizard.MAX_PHOTOS ? 'disabled' : ''}>
                  ${icon('camera', 14)} Add photos
                </button>
                <span class="tiny muted">
                  Up to ${Wizard.MAX_PHOTOS} photos, ${MAX_MB} MB each. The first one is the cover.
                </span>
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                     multiple hidden data-photo-input>
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
          <span class="thumb" style="position:relative;display:inline-block">
            <img src="${PB.adCover(ad)}" alt="">
            ${ad.featured ? '<span class="thumb-star" title="Promoted ad">⭐</span>' : ''}
          </span>
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
          ${ad.status === 'active'
            ? `<button class="btn ${ad.featured ? 'btn-accent' : 'btn-outline'} btn-sm" data-promote="${esc(id)}">
                ${icon('star', 14)} ${ad.featured ? 'Unpromote' : `Promote · ৳${promotePriceFor(ad)}`}
              </button>`
            : '<span class="tiny muted" style="align-self:center">Promote to reach more buyers</span>'}
          <button class="btn btn-outline btn-sm" data-toggle="${esc(id)}"${local ? ' disabled title="Needs the live site"' : ''}>
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

  const find = id => ads.find(a => a.id === id) || null;

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
    if (!done) return;

    // A rejected ad that is edited goes back to the review queue, so trust
    // whatever status the server reports rather than the one we asked for.
    await refresh();
    render();
  }

  /** The promotion price for the default period, or a blank fallback. */
  function promotePriceFor() {
    try { return API.promotionCost(7) || ''; } catch { return ''; }
  }

  /** Opens the paid-promotion modal for this ad. */
  async function promote(id) {
    const ad = find(id);
    if (!ad || ad.status !== 'active') return;
    if (!API.available) {
      UI.toast('Promotion needs the live site', 'err');
      return;
    }

    promotePrice = API.promotionCost(7) || 0;
    const perDays = (API.stats && API.stats.promoteDays) || 7;
    const durations = [7, 14, 30].filter(d => d >= perDays);
    let selected = durations.includes(perDays) ? perDays : durations[0];

    const body = () => `<p class="small muted">Promote “${esc(ad.title)}” — it floats to the top of search and appears in the Promoted ads section.</p>
      <div class="field">
        <label for="promoDuration">Duration</label>
        <select id="promoDuration">
          ${durations.map(d => `<option value="${d}" ${d === selected ? 'selected' : ''}>${d} days · ৳${(API.promotionCost(d) || 0)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label>Payment method</label>
        <select id="promoMethod">
          <option value="bkash">bKash (personal/business)</option>
          <option value="nagad">Nagad</option>
          <option value="upay">Upay</option>
          <option value="bank">Bank transfer</option>
          <option value="cash">Cash (collect on approval)</option>
        </select>
      </div>
      <div class="field">
        <label for="promoRef">Payment reference number</label>
        <input type="text" id="promoRef" placeholder="e.g. AK12345678" autocomplete="off">
        <div class="hint">Paste the transaction/Money Send ID from your wallet.</div>
      </div>
      <div class="row gap-8" style="justify-content:flex-end;align-items:center">
        <span class="small muted">Total</span>
        <span class="price" id="promoTotal">৳${promotePrice}</span>
      </div>
    `;

    const ok = await UI.modal({
      title: 'Promote this ad',
      bodyHtml: body(),
      confirmText: 'Pay and promote',
      onSubmit: async (back) => {
        const dur = Number(back.querySelector('#promoDuration')?.value || selected);
        const paymentMethod = back.querySelector('#promoMethod').value;
        const paymentRef = (back.querySelector('#promoRef')?.value || '').trim();
        if (!paymentRef) {
          UI.toast('Enter the payment reference number', 'err');
          throw new Error('ref');
        }
        const total = API.promotionCost(dur);
        const confirmed = window.confirm(
          `Pay ৳${total} to promote “${esc(ad.title)}” for ${dur} days?\n\n` +
          `Method: ${paymentMethod}. Reference: ${paymentRef}.\n\n` +
          `An admin will confirm the payment and your ad will go live in Promoted ads.`,
        );
        if (!confirmed) return null;
        await API.createPromotion({
          adId: ad.id, durationDays: dur,
          paymentMethod, paymentRef,
        });
        UI.toast('Promotion submitted — awaiting admin confirmation', 'ok');
        return true;
      },
    });

    if (ok !== null) {
      await refresh();
      render();
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

    // Photos picked in the editor go up now, so a failed upload aborts the
    // edit instead of saving a listing whose gallery points at nothing.
    const pending = editPhotos.filter(p => p.file);
    if (pending.length && !(await uploadPending(pending))) return;

    // The whole gallery is sent every time, which is what makes a removal or a
    // new cover stick. Online the API wants storage keys, not the URLs it
    // handed out; offline the local catalogue keeps data URLs.
    const photos = offline
      ? editPhotos.map(p => p.url)
      : editPhotos.map(p => Wizard.photoKey(p.url));
    if (!offline && photos.some(k => !k)) {
      UI.toast('One of the photos cannot be kept — remove it and add it again.', 'err');
      return;
    }

    const wasRejected = ad.status === 'rejected';
    const done = await guard(() => API.updateAd(id, toPayload(ad, {
      title,
      description: desc,
      price: Number(val('price')) || 0,
      status: val('status'),
      photos,
    })));

    if (!done) return;

    editing = null;
    editPhotos = [];
    const nowStatus = (done.ad && done.ad.status) || ad.status;
    UI.toast(
      wasRejected && nowStatus === 'pending'
        ? 'Thanks — your ad is back in the review queue.'
        : 'Ad updated',
      'ok',
    );
    await refresh();
    render();
  }

  async function remove(id) {
    const ad = find(id);
    const label = ad ? `“${ad.title}”` : 'this ad';
    if (!confirm(`Delete ${label}?\n\nThis cannot be undone.`)) return;

    const done = await guard(() => API.deleteAd(id), 'Ad deleted');
    if (!done) return;

    ads = ads.filter(a => a.id !== id);
    editing = null;
    editPhotos = [];
    render();
  }

  /** Re-reads the member's own list so statuses are never stale. */
  async function refresh() {
    const result = await API.myAds();
    ads = result.ads || [];
  }

  /* ----------------------------------------------------------------- events */

  const ACTIONS = [
    '[data-toggle]', '[data-promote]', '[data-edit-btn]', '[data-del]',
    '[data-save]', '[data-cancel]', '[data-add-photo]', '[data-photo-rm]',
    '[data-photo-cover]', '[data-reload]',
  ].join(',');

  $('#tableHost').addEventListener('click', async e => {
    const el = e.target.closest(ACTIONS);
    if (!el || el.disabled) return;

    const d = el.dataset;
    el.disabled = true;

    try {
      if (d.toggle) await toggleStatus(d.toggle);
      else if (d.promote) await promote(d.promote);
      else if (d.editBtn) {
        editing = editing === d.editBtn ? null : d.editBtn;
        // Opening an editor always starts from what the server has, never
        // from whatever was staged for the previous listing.
        editPhotos = editing
          ? ((find(editing) || {}).photos || []).map(url => ({ url }))
          : [];
        render();
        if (editing) $(`.editor-row[data-editor="${editing}"]`)?.scrollIntoView({
          block: 'center', behavior: 'smooth',
        });
      } else if (d.del) await remove(d.del);
      else if (d.save) await saveEdit(d.save);
      else if (d.cancel) { editing = null; editPhotos = []; render(); }
      else if ('addPhoto' in d) {
        $(`.editor-row[data-editor="${editing}"] [data-photo-input]`)?.click();
      } else if ('photoRm' in d) {
        editPhotos.splice(Number(d.photoRm), 1);
        renderPhotoGrid();
      } else if ('photoCover' in d) {
        const i = Number(d.photoCover);
        if (i > 0) {
          editPhotos.unshift(editPhotos.splice(i, 1)[0]);
          renderPhotoGrid();
        }
      } else if ('reload' in d) {
        await load();
        render();
      }
    } finally {
      if (el.isConnected) el.disabled = false;
    }
  });

  // Picking files stages them; saveEdit() uploads and sends the new gallery.
  $('#tableHost').addEventListener('change', async e => {
    const input = e.target.closest('[data-photo-input]');
    if (!input) return;

    const files = Array.from(input.files || []);
    input.value = '';               // so picking the same file twice still fires
    await addPhotos(files);
  });

  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    tab = b.dataset.tab;
    editing = null;
    editPhotos = [];
    render();
  });

  // Signing out from anywhere leaves this page showing the wrong person's ads.
  document.addEventListener('pb:signedout', () => {
    ads = [];
    signedOut = true;
    editing = null;
    editPhotos = [];
    render();
  });

  /* ------------------------------------------------------------------- boot */

  (async () => {
    render();               // skeleton
    await load();
    render();
  })();
})();
