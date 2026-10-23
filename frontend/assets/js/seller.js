/* ==========================================================================
   PetBikroy — public seller profile

   Every listing belongs to an account, so a buyer can see who they would be
   dealing with and what else that member has listed.

   The response carries no phone number or email on purpose — those come from
   an individual ad, not from a page that would let anyone harvest every
   seller on the site in one request.
   ========================================================================== */

(() => {
  'use strict';

  const { $, esc, icon } = UI;

  const id = UI.qs().get('id');
  const head = $('#sellerHead');
  const adsHost = $('#sellerAds');
  const loadMore = $('#loadMore');

  let page = 1;
  let pages = 1;
  let perPage = 12;

  UI.mountChrome();

  function notFound(title, text) {
    head.innerHTML = UI.emptyState({
      emoji: '🐾',
      title,
      text,
      action: { href: 'listings.html', label: 'Browse all ads' },
    });
    document.title = `Seller not found — ${PB.SITE.name}`;
  }

  function renderHead(user) {
    const facts = [];
    if (user.area) {
      facts.push(esc(user.area) + (user.loc ? ', ' + esc(PB.locName(user.loc)) : ''));
    } else if (user.loc) {
      facts.push(esc(PB.locName(user.loc)));
    }
    facts.push(`Member since ${esc(PB.formatDate(user.joined))}`);

    const live = Number(user.ads) || 0;

    head.innerHTML = `<div class="card card-pad" style="margin-bottom:6px">
      <div class="seller-head" style="align-items:center">
        <div class="seller-avatar" style="width:64px;height:64px;font-size:22px">
          ${esc(UI.initials(user.name))}</div>
        <div style="min-width:0">
          <h1 style="margin:0;font-size:24px">${esc(user.name)}</h1>
          <div class="small muted" style="flex-wrap:wrap">${facts.join(' · ')}</div>
          ${user.verified
            ? `<span class="verify-badge">${icon('shield', 12)} Verified seller</span>`
            : ''}
        </div>
        <span class="push"></span>
        <span class="tag">${PB.group(live)} live ${live === 1 ? 'ad' : 'ads'}</span>
      </div>
      ${user.bio ? `<div class="divider"></div><p class="desc" style="margin:0">${esc(user.bio)}</p>` : ''}
    </div>`;

    document.title = `${user.name} — ${PB.SITE.name}`;
    $('#crumbs').innerHTML = UI.crumbs([
      { label: 'Home', href: 'index.html' },
      { label: 'All ads', href: 'listings.html' },
      { label: user.name },
    ]);
  }

  /** Renders one page of the seller's listings, appending when asked. */
  function paint(ads, { append = false } = {}) {
    $('#sellerAdsSection').style.display = '';

    if (append) {
      adsHost.insertAdjacentHTML('beforeend', ads.map(ad => UI.adCard(ad)).join(''));
    } else {
      UI.renderAds(adsHost, ads, {
        empty: {
          emoji: '🕐',
          title: 'No live ads right now',
          text: 'This seller has nothing listed at the moment. Check back later.',
        },
      });
    }

    const shown = adsHost.querySelectorAll('.ad-card').length;
    $('#sellerAdsCount').textContent = shown ? `${PB.group(shown)} shown` : '';
    loadMore.classList.toggle('hide', page >= pages);
  }

  /** Reads a page from the API and folds it into the page state. */
  async function fetchPage(n) {
    const data = await API.request(
      'GET',
      `/api/users/${encodeURIComponent(id)}?page=${n}&perPage=${perPage}`,
    );
    page = data.page;
    pages = data.pages;
    perPage = data.perPage || perPage;
    return data;
  }

  /* ------------------------------------------------------------------ boot */

  (async () => {
    if (!id) {
      notFound('No seller selected', 'The link is missing a seller id.');
      return;
    }

    head.innerHTML = '<div class="card card-pad">'
      + '<div class="skeleton" style="height:64px;border-radius:12px"></div></div>';

    await API.ready;

    if (!API.available) {
      notFound(
        'Seller pages need the live site',
        'This copy of PetBikroy is running without a backend, so there are no seller accounts to show.',
      );
      return;
    }

    let data = null;
    try {
      data = await API.sellerProfile(id);
    } catch {
      data = null;
    }

    if (!data) {
      notFound(
        'This seller is no longer on PetBikroy',
        'The account may have been closed, or the link may be incorrect.',
      );
      return;
    }

    renderHead(data.user);
    page = data.page;
    pages = data.pages;
    perPage = data.perPage || perPage;
    paint(data.ads);
  })();

  /* ------------------------------------------------------------ load more */

  loadMore.addEventListener('click', async () => {
    loadMore.disabled = true;
    loadMore.textContent = 'Loading…';

    try {
      const data = await fetchPage(page + 1);
      paint(data.ads, { append: true });
    } catch {
      UI.toast('Could not load more ads.', 'err');
    } finally {
      loadMore.disabled = false;
      loadMore.textContent = 'Load more ads';
    }
  });
})();
