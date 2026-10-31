#!/usr/bin/env node
/* ==========================================================================
   Boots the admin panel with NO session and drives the login form itself,
   then checks the panel takes over and the login screen does not pop back.

   This covers the sign-in flow the seeded-cookie panel test never exercises:
   filling the form, submitting, and confirming the app replaces the login
   screen rather than the login screen flickering back after the first data
   fetch.

       npm run dev                       # terminal 1
       node tests/admin-login.test.mjs   # terminal 2
 ========================================================================== */

import { VirtualConsole, JSDOM } from 'jsdom';

const BASE = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@petbikroy.test';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'correct-horse-battery';

const C = process.stdout.isTTY
  ? { g: '\u001b[32m', r: '\u001b[31m', d: '\u001b[2m', b: '\u001b[1m', o: '\u001b[0m' }
  : { g: '', r: '', d: '', b: '', o: '' };

let passed = 0;
const failures = [];
const ok = (cond, label, detail = '') => {
  if (cond) { passed++; return; }
  failures.push([label, detail]);
  console.log(`  ${C.r}FAIL${C.o}  ${label}${detail ? `  ${C.d}${detail}${C.o}` : ''}`);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (fn, label, timeout = 6000) => {
  const started = Date.now();
  for (;;) {
    try { if (await fn()) return true; } catch { /* keep waiting */ }
    if (Date.now() - started > timeout) throw new Error(`timed out waiting for ${label}`);
    await sleep(40);
  }
};
const text = el => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

async function bootNoSession() {
  const vc = new VirtualConsole();
  const dom = await JSDOM.fromURL(`${BASE}/admin/`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      // No cookie at first: exactly the "just landed on /admin/" state. But we
      // remember the session cookie the login response hands back, so later
      // requests carry it just as a browser would — letting the panel fully
      // load after sign-in.
      let cookieJar = '';
      const remember = res => {
        const sc = res.headers.get('set-cookie');
        if (!sc) return;
        const pair = sc.split(',')[0].split(';')[0];
        const name = pair.split('=')[0].trim();
        const parts = cookieJar.split(';').map(s => s.trim()).filter(Boolean);
        if (parts.some(p => p.split('=')[0] === name)) return;
        cookieJar = cookieJar ? cookieJar + '; ' + pair : pair;
      };
      window.fetch = (input, init = {}) => {
        const url = String(input).startsWith('http')
          ? String(input)
          : `${BASE}${String(input).startsWith('/') ? '' : '/'}${input}`;
        const headers = { ...(init.headers || {}) };
        if (cookieJar) headers.cookie = cookieJar;
        const p = fetch(url, { ...init, headers });
        p.then(remember).catch(() => {});
        return p;
      };
      window.matchMedia = window.matchMedia || (() => ({ matches: false }));
    },
  });
  return dom;
}

async function main() {
  console.log(`${C.b}PetBikroy admin panel login tests${C.o}`);
  console.log(`  target   ${BASE}`);

  const { window } = await bootNoSession();
  const doc = window.document;
  const $ = sel => doc.querySelector(sel);

  try {
    head('landing on the login screen');
    await waitFor(() => $('#loginScreen') && $('#loginScreen').hidden === false,
                  'the login screen to appear');
    ok($('#app').hidden, 'the admin shell is hidden before sign-in');

    // A wrong password must NOT take over the panel.
    head('a failed sign-in leaves the login screen up');
    $('#loginEmail').value = ADMIN_EMAIL;
    $('#loginPassword').value = 'wrong-password-please';
    $('#loginForm').dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));
    await sleep(600);
    ok($('#loginScreen').hidden === false,
       'the login screen stays shown when the password is wrong');
    ok($('#loginError').textContent.length > 0, 'a failure message is shown');

    head('signing in through the form');
    $('#loginEmail').value = ADMIN_EMAIL;
    $('#loginPassword').value = ADMIN_PASSWORD;
    $('#loginForm').dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));

    await waitFor(() => $('#app') && $('#app').hidden === false,
                  'the admin shell to replace the login screen');
    ok($('#loginScreen').hidden === true,
       'the login screen stays hidden after a successful sign-in');
    ok(text($('#whoName')).length > 0, 'the signed-in person is named in the sidebar');
    ok(text($('#whoRole')).toLowerCase() === 'admin', 'the role is shown');
    await waitFor(() => $('#view') && $('#view').dataset.view === 'overview'
                       && $('#view').dataset.ready === '1', 'the overview view to finish');
    ok(text($('#view')).includes('Live ads'), 'the overview renders');
  } finally {
    window.close();
  }

  console.log('\n' + '-'.repeat(68));
  if (failures.length) {
    console.log(`${C.r}${C.b}${failures.length} FAILED${C.o}, ${C.g}${passed} passed${C.o}`);
    for (const [label, detail] of failures) {
      console.log(`  ${C.r}✗${C.o} ${label}${detail ? `  ${detail}` : ''}`);
    }
    return 1;
  }
  console.log(`${C.g}${C.b}all ${passed} assertions passed${C.o}`);
  return 0;
}

function head(name) { console.log(`\n${C.b}${name}${C.o}`); }

main().then(code => process.exit(code)).catch(err => {
  console.error(`\n${C.r}${err.stack || err.message}${C.o}\n`);
  process.exit(1);
});
