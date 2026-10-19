/* ==========================================================================
   PetBikroy — saved (favourite) ads

   Favourite ids live in localStorage (they are a personal list, not server
   state). The ads themselves are resolved through the API, falling back to
   the bundled catalogue when there is no backend.
   ========================================================================== */

(() => {
  'use strict';

  const { $ } = UI;

  UI.mountChrome();
  $('#crumbs').innerHTML = UI.crumbs([
    { label: 'Home', href: 'index.html' },
    { label: 'Saved ads' },
  ]);

  const host = $('#favHost');

  function showLoading() {
    host.className = 'grid-listings';
    host.innerHTML = Array.from({ length: 3 }, () =>
      '<div class="card ad-card" style="min-height:290px;opacity:.55">'
      + '<div class="skeleton" style="height:178px;border-radius:0"></div>'
      + '<div style="padding:12px 14px">'
      + '<div class="skeleton" style="width:70%;margin-bottom:8px"></div>'
      + '<div class="skeleton" style="width:40%"></div></div></div>').join('');
  }

  /** Guards against a slow first render overwriting a newer one. */
  let token = 0;

  async function render() {
    const ids = PB.getFavorites();
    const mine = ++token;

    $('#favCount').textContent = ids.length === 1 ? '1 saved' : `${ids.length} saved`;
    $('#clearFavs').classList.toggle('hide', ids.length === 0);

    if (!ids.length) {
      host.className = '';
      host.innerHTML = UI.emptyState({
        emoji: '💔',
        title: 'Nothing saved yet',
        text: 'Tap the heart on any ad to keep it here for later.',
        action: { href: 'listings.html', label: 'Browse ads' },
      });
      return;
    }

    showLoading();
    await API.ready;

    let ads = [];
    try {
      ads = await API.getAdsByIds(ids);
    } catch {
      ads = [];
    }
    if (mine !== token) return;

    if (!ads.length) {
      host.className = '';
      host.innerHTML = UI.emptyState({
        emoji: '🔍',
        title: 'Your saved ads are gone',
        text: 'They may have been sold or removed by their sellers.',
        action: { href: 'listings.html', label: 'Browse ads' },
      });
      return;
    }

    host.className = 'grid-listings';
    UI.renderAds(host, ads);
  }

  // Re-render when a heart is tapped on this page.
  document.addEventListener('pb:favchange', render);

  $('#clearFavs').addEventListener('click', () => {
    if (!confirm('Remove all saved ads?')) return;
    PB.clearFavorites();
    UI.updateFavBadge();
    UI.toast('Saved ads cleared', 'ok');
    render();
  });

  (async () => {
    showLoading();
    await render();
  })();
})();
