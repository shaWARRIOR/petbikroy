#!/usr/bin/env node
/* ==========================================================================
   Drives the "My ads" photo editor in a real DOM (jsdom) against a live
   server.

   The API suite proves that PUT replaces a gallery correctly; this proves the
   thing the API cannot see — that the dashboard shows the photos it loaded,
   removes and re-covers the right one, and sends back storage keys rather
   than the URLs it was given.

       npm run dev                       # terminal 1
       node tests/my-ads.test.mjs        # terminal 2

   Requires jsdom (a devDependency). The listing it creates is deleted at the
   end of the run.
   ========================================================================== */

import { VirtualConsole, JSDOM } from 'jsdom';

const BASE = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const PHONE = process.env.PB_DEMO_PHONE || '01311000000';
const PASSWORD = process.env.PB_DEMO_PASSWORD || 'petbikroy123';

const C = process.stdout.isTTY
  ? { g: '\u001b[32m', r: '\u001b[31m', d: '\u001b[2m', b: '\u001b[1m', o: '\u001b[0m' }
  : { g: '', r: '', d: '', b: '', o: '' };

/* ----------------------------------------------------------------- harness */

let passed = 0;
const failures = [];
let section = '';

const head = name => { section = name; console.log(`\n${C.b}${name}${C.o}`); };

function ok(condition, label, detail = '') {
  if (condition) { passed++; return; }
  failures.push([section, label, detail]);
  console.log(`  ${C.r}FAIL${C.o}  ${label}`);
  if (detail) console.log(`        ${C.d}${detail}${C.o}`);
}

const eq = (actual, expected, label) =>
  ok(actual === expected, label, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

const truthy = (value, label) => ok(Boolean(value), label, `got ${JSON.stringify(value)}`);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(fn, label, timeout = 10000) {
  const started = Date.now();
  for (;;) {
    try { if (await fn()) return true; } catch { /* keep waiting */ }
    if (Date.now() - started > timeout) throw new Error(`timed out waiting for ${label}`);
    await sleep(50);
  }
}

/* A real 1x1 PNG — the server sniffs magic bytes, so it has to be valid. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const pngBlob = () => new Blob([PNG], { type: 'image/png' });

/* ------------------------------------------------------------------- setup */

async function signIn() {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone: PHONE, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Could not sign in as ${PHONE} (${res.status}). `
      + 'Is the demo seed loaded?');
  }
  const cookie = (res.headers.getSetCookie?.() || []).map(c => c.split(';')[0]).join('; ');
  if (!cookie.includes('pb_user=')) throw new Error('No member session cookie came back.');
  return cookie;
}

const api = (cookie, path, init = {}) =>
  fetch(`${BASE}${path}`, { ...init, headers: { ...(init.headers || {}), cookie } });

async function upload(cookie, name) {
  const form = new FormData();
  form.append('photos', pngBlob(), name);
  const res = await api(cookie, '/api/upload', { method: 'POST', body: form });
  if (res.status !== 201) throw new Error(`upload failed (${res.status})`);
  return (await res.json()).keys[0];
}

async function createListing(cookie, keys) {
  const res = await api(cookie, '/api/ads', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      categoryId: 'dogs',
      subcategory: 'Labrador',
      kind: 'sale',
      title: 'Photo editor test listing, please ignore',
      description: 'Created by tests/my-ads.test.mjs to exercise the photo editor; deleted at the end of the run.',
      price: 12000,
      negotiable: true,
      locationId: 'dhaka',
      area: 'Dhanmondi',
      age: '1 year',
      gender: 'Male',
      vaccinated: true,
      condition: 'New',
      photos: keys,
    }),
  });
  if (res.status !== 201) throw new Error(`could not create the listing (${res.status})`);
  return (await res.json()).ad.id;
}

/** Boots the page, forwarding every request with the member cookie. */
async function boot(cookie, onError) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', e => onError(e.message || String(e)));

  return JSDOM.fromURL(`${BASE}/my-ads.html`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      // jsdom has no layout engine; the editor scrolls itself into view.
      window.Element.prototype.scrollIntoView = function () {};

      /* jsdom's File predates Blob.arrayBuffer(), so its bytes are read the
         DOM way before the request is handed to Node's fetch. */
      const readFile = file => new Promise((resolve, reject) => {
        const reader = new window.FileReader();
        reader.onload = () => resolve(Buffer.from(reader.result));
        reader.onerror = () => reject(reader.error || new Error('Could not read the photo.'));
        reader.readAsArrayBuffer(file);
      });

      window.fetch = async (input, init = {}) => {
        const url = String(input).startsWith('http')
          ? String(input)
          : `${BASE}${String(input).startsWith('/') ? '' : '/'}${input}`;

        // FormData comes from jsdom's realm and undici refuses it, so the
        // files are re-wrapped as Node blobs before the request leaves.
        let body = init.body;
        if (body && typeof body.entries === 'function') {
          const copy = new FormData();
          for (const [key, value] of body.entries()) {
            if (typeof value === 'string') {
              copy.append(key, value);
            } else {
              const bytes = await readFile(value);
              copy.append(key, new File([bytes], value.name || 'photo.png',
                { type: value.type || 'application/octet-stream' }));
            }
          }
          body = copy;
        }

        // jsdom's AbortSignal is a different class from the one undici checks
        // for, so the probe's timeout signal has to be dropped.
        return fetch(url, {
          ...init,
          body,
          signal: undefined,
          headers: { ...(init.headers || {}), cookie },
        });
      };
    },
  });
}

/* --------------------------------------------------------------------- run */

async function main() {
  console.log(`${C.b}PetBikroy "My ads" photo editor${C.o}`);
  console.log(`  target   ${BASE}`);

  let cookie;
  try {
    cookie = await signIn();
  } catch (err) {
    console.log(`\n${C.r}${err.message}${C.o}\n`);
    return 2;
  }

  const keys = [await upload(cookie, 'first.png'), await upload(cookie, 'second.png')];
  const adId = await createListing(cookie, keys);

  const errors = [];
  const dom = await boot(cookie, msg => errors.push(msg));
  const { window } = dom;
  const doc = window.document;
  const $ = sel => doc.querySelector(sel);

  try {
    head('the dashboard lists the listing');

    // Wait for the real row: the loading skeleton also renders table rows.
    await waitFor(() => $(`[data-edit-btn="${adId}"]`), 'the listing to appear');
    const editBtn = $(`[data-edit-btn="${adId}"]`);
    truthy(editBtn, 'the new listing has an Edit button');

    head('opening the editor');

    editBtn.click();
    await waitFor(() => $(`.editor-row[data-editor="${adId}"]`), 'the inline editor');
    const editor = () => $(`.editor-row[data-editor="${adId}"]`);
    const thumbs = () => [...editor().querySelectorAll('.photo-item')];

    eq(thumbs().length, 2, 'both stored photos are shown');
    eq(thumbs()[0].querySelector('img').getAttribute('src'), `/img/${keys[0]}`,
       'the first photo is the cover');
    truthy(thumbs()[0].querySelector('.primary-flag'), 'the cover carries a badge');
    eq(thumbs()[0].querySelector('[data-photo-cover]'), null,
       'the cover is not offered a "make cover" button');
    truthy(thumbs()[1].querySelector('[data-photo-cover]'),
           'the second photo can be promoted to cover');

    head('the add-photos button opens the file picker');

    const input = editor().querySelector('[data-photo-input]');
    truthy(input, 'the editor has a file input');
    truthy(input.hidden, 'the file input stays out of the layout');
    let opened = false;
    input.addEventListener('click', () => { opened = true; });
    editor().querySelector('[data-add-photo]').click();
    truthy(opened, 'clicking Add photos opens the picker');

    head('removing a photo');

    thumbs()[0].querySelector('[data-photo-rm]').click();
    await waitFor(() => thumbs().length === 1, 'the photo to disappear');
    eq(thumbs()[0].querySelector('img').getAttribute('src'), `/img/${keys[1]}`,
       'the photo that is left is the one that was kept');
    eq(thumbs()[0].querySelector('.primary-flag') !== null, true,
       'the remaining photo became the cover');

    head('adding a photo');

    const picked = new window.File([PNG], 'third.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [picked], configurable: true });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));

    await waitFor(() => thumbs().length === 2, 'the picked photo to preview');
    truthy(thumbs()[1].querySelector('img').getAttribute('src').startsWith('data:image/png'),
           'the new photo is previewed before it is uploaded');

    head('choosing the cover photo');

    thumbs()[1].querySelector('[data-photo-cover]').click();
    await waitFor(() => thumbs()[0].querySelector('img').getAttribute('src').startsWith('data:'),
                  'the new photo to move to the front');
    eq(thumbs()[1].querySelector('img').getAttribute('src'), `/img/${keys[1]}`,
       'the old cover moved to second place');

    head('saving');

    editor().querySelector('[data-save]').click();
    await waitFor(() => !$(`.editor-row[data-editor="${adId}"]`), 'the editor to close');

    const saved = await (await api(cookie, `/api/ads/${adId}`)).json();
    const photos = saved.ad.photos || [];
    eq(photos.length, 2, 'the listing still has two photos');
    truthy(photos[0].startsWith('/img/ads/'),
           'the uploaded photo is stored as a key, not as a URL that doubled the prefix');
    eq(photos[1], `/img/${keys[1]}`, 'the kept photo stayed second');

    const gone = await api(cookie, `/img/${keys[0]}`);
    eq(gone.status, 404, 'the removed photo was deleted from storage');
    const kept = await api(cookie, `/img/${keys[1]}`);
    eq(kept.status, 200, 'the kept photo is still served');

    head('the table reflects the new cover');

    await waitFor(() => {
      const img = doc.querySelector(`a[href="ad.html?id=${encodeURIComponent(adId)}"] img`);
      return img && img.getAttribute('src') === photos[0];
    }, 'the row thumbnail to update');

    eq(errors.length, 0, 'the page logged no errors',
       errors.slice(0, 2).join(' · '));
  } finally {
    const res = await api(cookie, `/api/ads/${adId}`, { method: 'DELETE' })
      .catch(() => ({ status: 0 }));
    if (res.status !== 200) {
      console.log(`\n${C.d}cleanup: could not delete ${adId} (${res.status})${C.o}`);
    }
    dom.window.close();
  }

  console.log('');
  if (failures.length) {
    console.log(`${C.r}${failures.length} failed${C.o}, ${passed} passed`);
    return 1;
  }
  console.log(`${C.g}all ${passed} assertions passed${C.o}`);
  return 0;
}

main().then(code => process.exit(code)).catch(err => {
  console.log(`\n${C.r}${err.message}${C.o}`);
  process.exit(1);
});
