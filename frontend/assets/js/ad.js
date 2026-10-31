/* ==========================================================================
   PetBikroy — single ad detail page

   Loads through API.getAd(), which talks to the backend when one is reachable
   and to the bundled catalogue when it is not. The page shows a skeleton in
   the meantime rather than flashing "not found".
   ========================================================================== */

(() => {
  'use strict';

  const { $, $$, esc, icon } = UI;

  const id = UI.qs().get('id');

  /* Chrome goes up immediately; the category highlight is patched in once we
     know the ad, because mountChrome() must only ever run once. */
  UI.mountChrome();

  const highlightCat = cat => {
    $$('.catnav a, #catNav a, nav a').forEach(a => {
      const href = a.getAttribute('href') || '';
      a.classList.toggle('is-active', Boolean(cat) && href === `listings.html?cat=${cat}`);
    });
  };

  /* ------------------------------------------------------------ page states */

  function showSkeleton() {
    $('#adRoot').innerHTML = `<div class="detail">
      <div class="stack">
        <div class="skeleton" style="height:380px;border-radius:12px"></div>
        <div class="skeleton" style="width:60%;height:26px;margin-top:18px"></div>
        <div class="skeleton" style="width:30%;height:20px;margin-top:10px"></div>
        <div class="skeleton" style="height:120px;margin-top:18px;border-radius:12px"></div>
      </div>
      <aside class="sidebar">
        <div class="skeleton" style="height:220px;border-radius:12px"></div>
      </aside>
    </div>`;
  }

  function showMissing() {
    $('#adRoot').innerHTML = UI.emptyState({
      emoji: '🐾',
      title: 'This ad is no longer available',
      text: 'It may have been sold, removed by the seller, or the link may be incorrect.',
      action: { href: 'listings.html', label: 'Browse other ads' },
    });
    $('#similar').innerHTML = '';
    document.title = `Ad not found — ${PB.SITE.name}`;
  }

  function showError(err) {
    $('#adRoot').innerHTML = UI.emptyState({
      emoji: '⚠️',
      title: 'Could not load this ad',
      text: err.message || 'Something went wrong. Please try again.',
      action: { href: location.href, label: 'Reload the page' },
    });
  }

  /* ------------------------------------------------------------------ boot */

  (async () => {
    if (!id) { showMissing(); return; }

    showSkeleton();
    await API.ready;

    let found;
    try {
      found = await API.getAd(id);
    } catch (err) {
      showError(err);
      return;
    }

    if (!found) { showMissing(); return; }

    const ad = found.ad;
    highlightCat(ad.cat);
    boot(ad);
  })();

  /* --------------------------------------------------------------- the page */

  function boot(ad) {
    const photos = PB.adImages(ad);
    let idx = 0;

    const sold = ad.status === 'sold';
    const price = PB.formatPrice(ad.price, ad.negotiable);
    const seller = ad.seller || {
      name: 'PetBikroy user', joined: new Date().toISOString(), verified: false, ads: 1,
    };

    // The API exposes the phone on the detail response only; the bundled
    // catalogue uses the older field name.
    const phone = ad.phone || ad.contactPhone || '';
    const email = ad.email || ad.contactEmail || '';

    // `isOwner` comes from the server: true only when the signed-in member
    // posted this listing. `canManage` is broader — it is also true for a
    // moderator, who must NOT see "This is your ad" on ads they do not own.
    // Offline there is no server verdict, so fall back to
    // "did this browser create it?".
    const mine = ad.isOwner === true
      || (ad.canManage === undefined && PB.isUserAd(ad.id));

    // The account behind the listing, when the server told us about one.
    const sellerLink = seller.id ? `seller.html?id=${encodeURIComponent(seller.id)}` : '';

    /* -------------------------------------------------------------- gallery */

    function galleryHtml() {
      return `<div class="gallery">
        <div class="gallery-main">
          <img id="galMain" src="${photos[idx]}" alt="${esc(ad.title)}">
          ${photos.length > 1 ? `
            <button class="nav prev" id="galPrev" aria-label="Previous photo">${icon('chevL', 18)}</button>
            <button class="nav next" id="galNext" aria-label="Next photo">${icon('chevR', 18)}</button>
            <span class="gallery-count"><span id="galNow">1</span> / ${photos.length}</span>` : ''}
        </div>
        ${photos.length > 1 ? `<div class="gallery-thumbs" id="galThumbs">
          ${photos.map((p, i) => `<button data-i="${i}"${i === 0 ? ' class="is-active"' : ''}
            aria-label="Photo ${i + 1}"><img src="${p}" alt=""></button>`).join('')}
        </div>` : ''}
      </div>`;
    }

    /* -------------------------------------------------------------- sidebar */

    function sidebarHtml() {
      return `<aside class="sidebar">
        <div class="card card-pad">
          <div class="seller-head">
            <div class="seller-avatar">${esc(UI.initials(seller.name))}</div>
            <div style="min-width:0">
              <div class="seller-name">${sellerLink
                ? `<a href="${esc(sellerLink)}">${esc(seller.name)}</a>`
                : esc(seller.name)}</div>
              <div class="tiny muted">Member since ${esc(PB.formatDate(seller.joined))}</div>
              ${seller.verified ? `<span class="verify-badge">${icon('shield', 12)} Verified seller</span>` : ''}
            </div>
          </div>

          ${sellerLink ? `<a class="btn btn-outline btn-block btn-sm mt-8"
             href="${esc(sellerLink)}">View all their ads</a>` : ''}

          <div class="divider"></div>

          <div class="row gap-8 tiny muted">
            ${icon('clock', 14)}<span>Posted ${esc(PB.timeAgo(ad.created))}</span>
          </div>
          <div class="row gap-8 tiny muted mt-8">
            ${icon('eye', 14)}<span><span id="viewCount">${PB.group(ad.views || 0)}</span> views</span>
          </div>

          ${sold ? `<div class="divider"></div>
            <div class="status-pill status-sold" style="display:block;text-align:center">
              This pet has been sold</div>` : ''}

          <div class="contact-actions">
            <button class="btn btn-primary btn-block" id="revealPhone">
              ${icon('phone', 17)} Show phone number</button>
            <button class="btn btn-accent btn-block" id="messageSeller"
                  style="display:${sold || mine ? 'none' : 'block'}">
              ${icon('chat', 17)} Message seller</button>
            <button class="btn btn-outline btn-block" id="favBtn2">
              ${icon('heart', 17)} <span id="favLabel">Save ad</span></button>
            <button class="btn btn-ghost btn-block btn-sm" id="reportBtn">
              ${icon('shield', 15)} Report this ad</button>
          </div>

          <div class="hide mt-8" id="phoneBox">
            <div class="phone-reveal"><span>${esc(phone || 'Not provided')}</span>
              ${phone ? `<a class="btn btn-outline btn-sm"
                 href="tel:${esc(String(phone).replace(/[^0-9+]/g, ''))}">Call</a>` : ''}
            </div>
            ${email ? `<div class="tiny muted mt-8">${esc(email)}</div>` : ''}
          </div>

          <div class="hide mt-8" id="reportBox">
            <label class="field-label" for="reportReason">Why are you reporting this?</label>
            <select id="reportReason"><option value="">Choose a reason…</option></select>
            <textarea id="reportNote" rows="3" maxlength="500"
                      placeholder="Anything else we should know? (optional)"></textarea>
            <div class="row gap-8 mt-8">
              <button class="btn btn-primary btn-sm" id="reportSend">Send report</button>
              <button class="btn btn-ghost btn-sm" id="reportCancel">Cancel</button>
            </div>
          </div>
        </div>

        <div class="safety">
          <h4>${icon('shield', 15)} Stay safe when buying</h4>
          <ul>
            <li>Meet the seller in person and see the animal first.</li>
            <li>Ask for vaccination records and a vet checkup report.</li>
            <li>Never send money in advance via bKash or bank transfer.</li>
            <li>Check the parents' health if buying a puppy or kitten.</li>
            <li>Report suspicious ads — good deals that feel rushed usually are.</li>
          </ul>
        </div>

        ${mine ? `<div class="card card-pad">
          <h4 style="font-size:14px">This is your ad</h4>
          <div style="display:grid;gap:8px">
            <a class="btn btn-outline btn-block" href="my-ads.html">Manage in My ads</a>
            <button class="btn btn-danger btn-block" id="deleteMine">
              ${icon('trash', 16)} Delete ad</button>
          </div>
        </div>` : ''}
      </aside>`;
    }

    /* ------------------------------------------------------------ main body */

    function specsHtml() {
      const rows = [
        ['Category', PB.catName(ad.cat)],
        ['Breed / type', ad.sub],
        ad.age ? ['Age', ad.age] : null,
        ad.gender ? ['Gender', ad.gender] : null,
        ['Vaccinated', ad.vaccinated ? 'Yes' : 'No'],
        ['Condition', ad.condition || '—'],
        ['Location', ad.area ? `${ad.area}, ${PB.locName(ad.loc)}` : PB.locName(ad.loc)],
        ['Ad ID', String(ad.id).toUpperCase()],
      ].filter(Boolean);

      return `<div class="spec-grid">
        ${rows.map(([k, v]) => `<div class="spec"><div class="k">${esc(k)}</div>
          <div class="v">${esc(v)}</div></div>`).join('')}
      </div>`;
    }

    // A non-active ad (held, awaiting review, or rejected) explains why, so the
    // person who posted it can see the automated moderator's verdict inline —
    // the same messages "My ads" already shows.
    function noticeHtml() {
      if (ad.status === 'active') return '';
      const rejected = ad.status === 'rejected' || ad.autoDecision === 'rejected';
      if (rejected && ad.rejectionReason) {
        return `<div class="card card-pad" style="background:#fdeaea">
          <strong class="small">Needs changes:</strong>
          <span class="small">${esc(ad.rejectionReason)}</span>
          ${ad.autoReason ? `<div class="tiny muted">Automated review: ${esc(ad.autoReason)}</div>` : ''}
          <span class="tiny muted"> — edit the ad and it goes back to the review queue.</span>
        </div>`;
      }
      if ((ad.status === 'pending' || rejected) && ad.autoDecision && ad.autoReason) {
        return `<div class="card card-pad" style="background:#fdf5e4">
          <strong class="small">Automated review ${esc(ad.autoDecision === 'rejected' ? 'rejected' : 'held')} this ad:</strong>
          <span class="small">${esc(ad.autoReason)}</span>
          <span class="tiny muted"> — a moderator will check it, or edit and resubmit.</span>
        </div>`;
      }
      if (ad.status === 'pending') {
        return `<div class="card card-pad" style="background:#fdf5e4">
          <span class="small">Waiting for a moderator to review this ad.</span>
        </div>`;
      }
      return '';
    }

    function render() {
      $('#crumbs').innerHTML = UI.crumbs([
        { label: 'Home', href: 'index.html' },
        { label: 'All ads', href: 'listings.html' },
        { label: PB.catName(ad.cat), href: `listings.html?cat=${ad.cat}` },
        { label: ad.sub || ad.title, href: `listings.html?cat=${ad.cat}&sub=${encodeURIComponent(ad.sub || '')}` },
        { label: ad.title },
      ]);

      $('#adRoot').innerHTML = `<div class="detail">
        <div class="stack">
          ${galleryHtml()}

          <div class="detail-head">
            <h1>${esc(ad.title)}</h1>
            <div class="detail-price">${price.free ? 'Free to a good home'
              : `<span class="cur">${PB.SITE.currency}</span>${PB.group(ad.price)}`}
              ${!price.free && ad.negotiable ? '<span class="small muted" style="font-weight:600"> · negotiable</span>' : ''}
            </div>
            <div class="detail-sub">
              <span class="row gap-8">${icon('pin', 14)} ${esc(ad.area ? ad.area + ', ' + PB.locName(ad.loc) : PB.locName(ad.loc))}</span>
              <span class="row gap-8">${icon('clock', 14)} ${esc(PB.timeAgo(ad.created))}</span>
              ${sold ? '<span class="status-pill status-sold">Sold</span>' : ''}
              ${ad.featured ? '<span class="tag tag-orange">Promoted</span>' : ''}
            </div>
          </div>

          <div class="card card-pad">
            <h3>Details</h3>
            ${specsHtml()}
          </div>

          <div class="card card-pad">
            <h3>Description</h3>
            <p class="desc">${esc(ad.desc || 'The seller has not added a description.')}</p>
          </div>

          ${noticeHtml()}
        </div>

        ${sidebarHtml()}
      </div>`;

      bindGallery();
      bindSidebar();
    }

    /* ------------------------------------------------------------- gallery UX */

    function setPhoto(n) {
      idx = (n + photos.length) % photos.length;
      $('#galMain').src = photos[idx];
      const now = $('#galNow');
      if (now) now.textContent = String(idx + 1);
      $$('#galThumbs button').forEach((b, i) => b.classList.toggle('is-active', i === idx));
    }

    function bindGallery() {
      $('#galPrev')?.addEventListener('click', () => setPhoto(idx - 1));
      $('#galNext')?.addEventListener('click', () => setPhoto(idx + 1));
      $('#galThumbs')?.addEventListener('click', e => {
        const b = e.target.closest('button[data-i]');
        if (b) setPhoto(Number(b.dataset.i));
      });
      document.addEventListener('keydown', e => {
        if (photos.length < 2) return;
        if (e.key === 'ArrowLeft') setPhoto(idx - 1);
        if (e.key === 'ArrowRight') setPhoto(idx + 1);
      });
    }

    /* ------------------------------------------------------------- sidebar UX */

    function bindSidebar() {
      const favBtn = $('#favBtn2');
      const favLabel = $('#favLabel');

      const syncFav = () => {
        const on = PB.isFavorite(ad.id);
        favLabel.textContent = on ? 'Saved' : 'Save ad';
        favBtn.classList.toggle('btn-primary', on);
        favBtn.classList.toggle('btn-outline', !on);
      };
      syncFav();
      favBtn.addEventListener('click', () => {
        const added = PB.toggleFavorite(ad.id);
        syncFav();
        UI.updateFavBadge();
        UI.toast(added ? 'Saved to favourites' : 'Removed from favourites', added ? 'ok' : '');
      });

      $('#revealPhone').addEventListener('click', () => {
        $('#phoneBox').classList.remove('hide');
        $('#revealPhone').classList.add('hide');
      });

      bindMessage();

      bindReport();

      $('#deleteMine')?.addEventListener('click', async () => {
        if (!confirm('Delete this ad permanently? This cannot be undone.')) return;
        try {
          await API.deleteAd(ad.id);
          UI.toast('Ad deleted', 'ok');
          setTimeout(() => { location.href = 'my-ads.html'; }, 600);
        } catch (err) {
          UI.toast(err.message || 'The ad could not be deleted.', 'err');
        }
      });
    }

    /* ---------------------------------------------------------- message */

    async function bindMessage() {
      const btn = $('#messageSeller');
      if (!btn) return;

      btn.addEventListener('click', async () => {
        // Messaging needs an account, which needs the live site.
        if (!API.available || !API.user) {
          location.href = `login.html?next=${encodeURIComponent('messages.html')}`;
          return;
        }

        const sendBtn = btn;
        sendBtn.disabled = true;
        try {
          const { conversation } = await API.messageStart({ adId: id });
          UI.toast('Starting a conversation with the seller', 'ok');
          location.href = `messages.html?conv=${encodeURIComponent(conversation.id)}`;
        } catch (err) {
          UI.toast(err.message || 'The message could not be started.', 'err');
          sendBtn.disabled = false;
        }
      });
    }

    /* --------------------------------------------------------------- reporting */

    async function bindReport() {
      const btn = $('#reportBtn');
      const box = $('#reportBox');
      const select = $('#reportReason');

      btn.addEventListener('click', async () => {
        box.classList.toggle('hide');
        if (box.classList.contains('hide') || select.options.length > 1) return;

        const reasons = await API.reportReasons();
        select.innerHTML = '<option value="">Choose a reason…</option>' +
          reasons.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
      });

      $('#reportCancel').addEventListener('click', () => box.classList.add('hide'));

      $('#reportSend').addEventListener('click', async () => {
        const reason = select.value;
        if (!reason) { UI.toast('Please choose a reason first.', 'err'); return; }

        const send = $('#reportSend');
        send.disabled = true;
        try {
          await API.report(ad.id, reason, $('#reportNote').value.trim());
          box.classList.add('hide');
          UI.toast('Thanks — our moderators will take a look.', 'ok');
        } catch (err) {
          UI.toast(err.status === 409
            ? 'You have already reported this ad.'
            : (err.message || 'The report could not be sent.'), 'err');
        } finally {
          send.disabled = false;
        }
      });
    }

    /* ------------------------------------------------------------- rendering */

    render();
    document.title = `${ad.title} — ${PB.SITE.name}`;

    /* ---------------------------------------------------------------- views */

    // One view per visitor per day is counted server-side, so refreshing the
    // page will not inflate the number.
    API.trackView(ad.id).then(res => {
      if (res && typeof res.views === 'number') {
        const el = $('#viewCount');
        if (el) el.textContent = PB.group(res.views);
      }
    });

    /* -------------------------------------------------------------- similar */

    loadSimilar();

    async function loadSimilar() {
      let ads = [];
      try {
        const data = await API.listAds({ cat: ad.cat, perPage: 8, sort: 'recent' });
        ads = data.ads.filter(a => a.id !== ad.id).slice(0, 4);
      } catch {
        ads = [];
      }
      if (!ads.length) ads = PB.similar(ad, 4).filter(a => a.id !== ad.id);
      if (!ads.length) return;

      $('#similar').innerHTML = `<section class="section">
        <div class="section-head"><h2>Similar ads</h2>
          <a class="see-all" href="listings.html?cat=${ad.cat}">View all ${esc(PB.catName(ad.cat))} →</a>
        </div>
        <div class="grid-listings" id="simGrid"></div>
      </section>`;
      UI.renderAds($('#simGrid'), ads);
    }
  }
})();
