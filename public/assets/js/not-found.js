/* ==========================================================================
   PetBikroy — 404 page
   Mounts the shared header/footer and turns the page into a jumping-off point
   rather than a dead end. Deliberately does not call the API: an error page
   should still work when things are broken.
   ========================================================================== */

(() => {
  'use strict';

  UI.mountChrome();

  const host = document.getElementById('nfCats');
  if (!host) return;

  host.innerHTML = PB.CATEGORIES.map(c => `
    <a class="cat-tile" href="listings.html?cat=${encodeURIComponent(c.id)}">
      <span class="emoji">${c.emoji}</span>
      <span class="name">${UI.esc(c.name)}</span>
      <span class="count">Browse ads</span>
    </a>
  `).join('');
})();
