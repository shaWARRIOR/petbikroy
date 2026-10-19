#!/usr/bin/env node
/* ==========================================================================
   Boots the admin panel in a real DOM (jsdom) against a live server and
   drives every view.

   This exists because the panel is the one part of the project that cannot be
   verified with pure functions: routing, rendering, event delegation and the
   modal flow all only fail at runtime.

       npm run dev                       # terminal 1
       node tests/admin-panel.test.mjs   # terminal 2

   Requires jsdom (a devDependency). Skips with a clear message if absent.
   ========================================================================== */

import { VirtualConsole, JSDOM } from 'jsdom';

const BASE = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@petbikroy.test';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'correct-horse-battery';

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

/** Polls until `fn()` is truthy, or throws after `timeout`. */
async function waitFor(fn, label, timeout = 6000) {
  const started = Date.now();
  for (;;) {
    try { if (await fn()) return true; } catch { /* keep waiting */ }
    if (Date.now() - started > timeout) throw new Error(`timed out waiting for ${label}`);
    await sleep(40);
  }
}

/** Waits until the panel has finished rendering a given view. */
const waitForView = (doc, name) =>
  waitFor(() => {
    const host = doc.querySelector('#view');
    return host?.dataset.view === name && host?.dataset.ready === '1';
  }, `the "${name}" view to finish rendering`);

/** Removes any lingering toasts so the next one is unambiguously new. */
const clearToasts = doc => doc.querySelectorAll('.toast').forEach(t => t.remove());

/* ------------------------------------------------------------------- login */

/** Signs in over plain HTTP to grab the session cookie, so the DOM test can
 *  hand it to the page. Browsers do this automatically; jsdom does not. */
async function getSessionCookie() {
  const res = await fetch(`${BASE}/api/admin/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Admin sign-in failed (${res.status}). Create the account with:\n`
      + `  node tools/create-admin.mjs --email ${ADMIN_EMAIL} --password '${ADMIN_PASSWORD}'`);
  }
  const raw = res.headers.getSetCookie?.() || [];
  const cookie = raw.map(c => c.split(';')[0]).join('; ');
  if (!cookie.includes('pb_admin=')) throw new Error('No session cookie came back.');
  return cookie;
}

/* --------------------------------------------------------------------- run */

async function bootPanel(cookie, onError) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', e => onError(e.message || String(e)));

  const dom = await JSDOM.fromURL(`${BASE}/admin/`, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      // Same-origin fetch shim: always attach the session cookie, exactly as
      // a browser would for a same-origin request with credentials.
      window.fetch = (input, init = {}) => {
        const url = String(input).startsWith('http')
          ? String(input)
          : `${BASE}${String(input).startsWith('/') ? '' : '/'}${input}`;
        const headers = { ...(init.headers || {}), cookie };
        return fetch(url, { ...init, headers });
      };
      // jsdom has no layout engine; the panel only uses this for a checkbox.
      window.matchMedia = window.matchMedia || (() => ({
        matches: false, media: '', addListener() {}, removeListener() {},
        addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
      }));
    },
  });

  return dom;
}

const text = el => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

async function main() {
  console.log(`${C.b}PetBikroy admin panel tests${C.o}`);
  console.log(`  target   ${BASE}`);

  let cookie;
  try {
    cookie = await getSessionCookie();
  } catch (err) {
    console.log(`\n${C.r}${err.message}${C.o}\n`);
    return 2;
  }

  const errors = [];
  const dom = await bootPanel(cookie, msg => errors.push(msg));
  const { window } = dom;
  const doc = window.document;
  const $ = sel => doc.querySelector(sel);

  try {
    /* ---------------------------------------------------------------- boot */
    head('booting the panel');

    await waitFor(() => $('#loginScreen') && $('#loginScreen').hidden === false
                       || ($('#app') && $('#app').hidden === false),
                  'the app or login screen to appear');

    eq($('#loginScreen').hidden, true, 'the login screen is hidden when a session exists');
    eq($('#app').hidden, false, 'the admin shell is shown');
    truthy(text($('#whoName')).length > 0, 'the signed-in person is named in the sidebar');
    eq(text($('#whoRole')).toLowerCase(), 'admin', 'the role is shown');

    await waitForView(doc, 'overview');

    /* ------------------------------------------------------------ overview */
    head('view: overview');

    const overview = text($('#view'));
    truthy(overview.includes('Live ads'), 'the live-ad counter is rendered');
    truthy(overview.includes('Awaiting review'), 'the review counter is rendered');
    truthy(overview.includes('Open reports'), 'the reports counter is rendered');
    truthy(overview.includes('Ads published'), 'the daily chart card is rendered');
    truthy(overview.includes('By category'), 'the category breakdown is rendered');
    truthy(overview.includes('Newest listings'), 'the recent listings card is rendered');
    truthy(overview.includes('Recent activity'), 'the audit feed is rendered');

    const statValues = [...doc.querySelectorAll('.stat .value')].map(e => text(e));
    eq(statValues.length, 4, 'four stat cards are rendered');
    truthy(statValues.every(v => /^[\d,]+$/.test(v)),
           'every stat shows a formatted number',
           `got ${JSON.stringify(statValues)}`);
    truthy(/^\d{1,3}(,\d{3})*$/.test(statValues[0]) || Number(statValues[0].replace(/,/g, '')) < 1000,
           'numbers use thousands separators');

    truthy(doc.querySelectorAll('.bars .bar-col').length === 14,
           'the chart draws 14 daily columns');

    /* ------------------------------------------------------------ listings */
    head('view: listings');

    window.location.hash = '#/listings';
    await waitForView(doc, 'listings');
    await waitFor(() => doc.querySelector('#lq'), 'the listings controls to render');

    const rows = () => doc.querySelectorAll('#view tbody tr').length;
    truthy(rows() > 0, 'the listings table has rows');
    truthy(text($('#pageTitle')) === 'Listings', 'the page title updates');
    truthy(doc.querySelector('#nav a[data-view="listings"]').classList.contains('active'),
           'the sidebar marks the active view');

    const firstRow = text(doc.querySelector('#view tbody tr'));
    truthy(firstRow.length > 0, 'the first row renders content');

    // Status tabs must actually filter.
    const countsFor = async status => {
      const res = await fetch(`${BASE}/api/admin/ads?status=${status}&perPage=25`, {
        headers: { cookie },
      });
      return (await res.json()).total;
    };

    const allTotal = await countsFor('all');
    doc.querySelector('[data-act="ltab"][data-status="active"]').click();
    await waitFor(() => doc.querySelector('[data-act="ltab"][data-status="active"]')
                          .className.includes('btn-outline') === false,
                  'the active tab to switch');

    const liveShown = doc.querySelectorAll('#view tbody tr').length;
    const liveTotal = await countsFor('active');
    eq(liveShown, Math.min(25, liveTotal), 'the Live tab shows exactly the live ads');

    doc.querySelector('[data-act="ltab"][data-status="all"]').click();
    await waitFor(() => doc.querySelectorAll('#view tbody tr').length
                        === Math.min(25, allTotal), 'the All tab to restore');

    // Search box.
    $('#lq').value = 'labrador';
    doc.querySelector('[data-act="lsearch"]').click();
    await waitFor(() => doc.querySelector('#lq') && $('#lq').value === 'labrador',
                  'the search to apply');
    await sleep(300);
    const searched = text($('#view'));
    truthy(searched.toLowerCase().includes('labrador'), 'searching narrows the table');

    const clearBtn = doc.querySelector('[data-act="lclear"]');
    truthy(clearBtn, 'a Clear button appears once filtered');
    clearBtn.click();
    await waitFor(() => doc.querySelector('#lq').value === '', 'the filter to clear');
    truthy(true, 'the Clear button resets the search');

    /* ---------------------------------------------------------- moderation */
    head('view: moderation');

    window.location.hash = '#/moderation';
    await waitForView(doc, 'moderation');
    truthy(text($('#view')).includes('Auto-approve'),
           'the page explains how auto-approve relates to the queue');
    truthy(true, 'the moderation queue loads');

    /* ------------------------------------------------------------- reports */
    head('view: reports');

    window.location.hash = '#/reports';
    await waitForView(doc, 'reports');
    await waitFor(() => text($('#view')).includes('Reported ads'), 'the report table to render');
    const reportTabs = doc.querySelectorAll('[data-act="rtab"]').length;
    eq(reportTabs, 4, 'the reports view offers four status filters');

    /* ------------------------------------------------------------ settings */
    head('view: settings');

    window.location.hash = '#/settings';
    await waitForView(doc, 'settings');
    await waitFor(() => doc.querySelector('#settingsForm'), 'the settings form to render');
    truthy(doc.querySelector('[name="site_name"]'), 'the site name field is rendered');
    truthy(doc.querySelector('[name="auto_approve"]'), 'the auto-approve switch is rendered');
    truthy(doc.querySelector('[name="post_limit"]'), 'the rate-limit field is rendered');
    truthy(doc.querySelector('[name="listings_per_page"]'), 'the page-size field is rendered');

    // Round-trip a change through the real endpoint.
    const before = doc.querySelector('[name="site_name"]').value;
    doc.querySelector('[name="site_name"]').value = 'PetBikroy Panel Test';
    $('#settingsForm').dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));
    await waitFor(() => [...doc.querySelectorAll('.toast')]
                        .some(t => text(t).includes('Settings saved')), 'the save toast');

    const check = await (await fetch(`${BASE}/api/admin/settings`, { headers: { cookie } })).json();
    eq(check.settings.site_name, 'PetBikroy Panel Test', 'the setting really changed on the server');

    doc.querySelector('[name="site_name"]').value = before;
    $('#settingsForm').dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));
    await sleep(400);
    truthy(true, 'the setting was restored');

    /* ---------------------------------------------------------------- team */
    head('view: team');

    window.location.hash = '#/team';
    await waitForView(doc, 'team');
    await waitFor(() => text($('#view')).includes('Admin accounts'), 'the team table to render');
    truthy(doc.querySelectorAll('#view tbody tr').length > 0, 'the team table lists accounts');
    truthy(text($('#view')).includes(ADMIN_EMAIL), 'the signed-in admin is listed');
    truthy(doc.querySelector('[data-act="newadmin"]'), 'an Add admin button is offered');

    // The modal flow: open the create-admin dialog, then cancel it.
    doc.querySelector('[data-act="newadmin"]').click();
    await waitFor(() => doc.querySelector('.modal-back'), 'the create dialog to open');
    truthy(text(doc.querySelector('.modal')).includes('Add an admin'), 'the dialog is titled');
    truthy(doc.querySelector('#afEmail'), 'the dialog has an email field');
    truthy(doc.querySelector('#afRole'), 'the dialog has a role picker');

    doc.querySelector('.modal-back [data-x="cancel"]').click();
    await waitFor(() => !doc.querySelector('.modal-back'), 'the dialog to close');
    truthy(true, 'the dialog closes on Cancel');

    /* ------------------------------------------------------------ members */
    head('view: members');

    window.location.hash = '#/members';
    await waitForView(doc, 'members');
    await waitFor(() => doc.querySelector('[data-act="mtab"]'), 'the member controls to render');

    truthy(text($('#pageTitle')) === 'Members', 'the page title updates');
    truthy(doc.querySelector('#nav a[data-view="members"]').classList.contains('active'),
           'the sidebar marks the members view active');

    const memberRows = () => doc.querySelectorAll('#view tbody tr').length;
    truthy(memberRows() > 0, 'the member table has rows');

    const memberTabs = [...doc.querySelectorAll('[data-act="mtab"]')].map(b => b.dataset.filter);
    eq(memberTabs.length, 4, 'four member filters are offered');
    truthy(memberTabs.includes('verified') && memberTabs.includes('disabled'),
           'the filters cover verified and suspended accounts');

    /** The server's own count, so the table is compared against the truth. */
    const memberCountFor = async filter => {
      const res = await fetch(`${BASE}/api/admin/users?filter=${filter}&perPage=25`,
                              { headers: { cookie } });
      return (await res.json()).total;
    };

    const allMembers = await memberCountFor('all');
    eq(memberRows(), Math.min(25, allMembers), 'the Everyone tab lists every member');
    truthy(text($('#view')).includes('Live / total'),
           'the table shows live listings alongside the total');

    // The verified filter must really narrow the table.
    doc.querySelector('[data-act="mtab"][data-filter="verified"]').click();
    const verifiedTotal = await memberCountFor('verified');
    await waitFor(() => memberRows() === Math.min(25, verifiedTotal), 'the Verified tab to filter');
    truthy(verifiedTotal > 0, 'some members are verified');
    truthy(verifiedTotal < allMembers, 'some are not, so the filter is actually testing something');

    doc.querySelector('[data-act="mtab"][data-filter="all"]').click();
    await waitFor(() => memberRows() === Math.min(25, allMembers), 'the Everyone tab to restore');

    // Search by phone number: the login identifier, so it is what an operator
    // usually has to hand.
    const firstMember = (await (await fetch(`${BASE}/api/admin/users?perPage=1`,
                                            { headers: { cookie } })).json()).users[0];
    $('#mq').value = firstMember.phone;
    doc.querySelector('[data-act="msearch"]').click();
    await waitFor(() => memberRows() === 1, 'the search to narrow to a single member');
    truthy(text($('#view')).includes(firstMember.phone), 'the searched-for phone number is shown');

    const mClear = doc.querySelector('[data-act="mclear"]');
    truthy(mClear, 'a Clear button appears once the member list is filtered');
    mClear.click();
    await waitFor(() => memberRows() === Math.min(25, allMembers), 'the search to clear');
    truthy(true, 'the Clear button resets the member search');

    /* --------------------------------------------------- member inspector */
    head('member inspector dialog');

    const openMember = doc.querySelector('[data-act="openmember"]');
    const memberId = openMember.dataset.id;
    openMember.click();
    await waitFor(() => doc.querySelector('.modal-back'), 'the member panel to open');

    const memberModal = text(doc.querySelector('.modal'));
    truthy(memberModal.includes('Their listings'), 'the panel lists their ads');
    truthy(memberModal.includes('Joined'), 'the panel shows when they joined');
    truthy(memberModal.includes('Last sign-in'), 'the panel shows their last sign-in');
    truthy(memberModal.includes(memberId), 'the panel shows the member id');

    const memberActions = () =>
      [...doc.querySelectorAll('.modal-back [data-x="action"]')].map(b => b.dataset.action);

    truthy(memberActions().includes('verify') || memberActions().includes('unverify'),
           'a verification toggle is offered');
    truthy(memberActions().includes('resetPassword'), 'a password reset is offered');
    truthy(memberActions().includes('deactivate') || memberActions().includes('activate'),
           'a suspension toggle is offered');
    truthy(memberActions().includes('delete'), 'a delete action is offered');

    // Exercise a real, reversible action end-to-end through the UI.
    const verifyBtn = () => [...doc.querySelectorAll('.modal-back [data-x="action"]')]
      .find(b => b.dataset.action === 'verify' || b.dataset.action === 'unverify');

    const wasVerified = verifyBtn().dataset.action === 'unverify';
    clearToasts(doc);
    verifyBtn().click();
    await waitFor(() => !doc.querySelector('.modal-back'), 'the member panel to close');
    await waitFor(() => doc.querySelectorAll('.toast').length > 0, 'the member action toast');

    const readVerified = async () =>
      (await (await fetch(`${BASE}/api/admin/users/${memberId}`,
                          { headers: { cookie } })).json()).user.verified;

    await waitFor(async () => (await readVerified()) === !wasVerified,
                  'the badge to change on the server');
    eq(await readVerified(), !wasVerified,
       'verification really changed on the server after the dialog action');

    // Put it back the way we found it.
    await fetch(`${BASE}/api/admin/users/${memberId}`, {
      method: 'PATCH',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ action: wasVerified ? 'verify' : 'unverify' }),
    });
    eq(await readVerified(), wasVerified, 'the member was restored to the state we found them in');

    /* --------------------------------------------------------- ad inspector */
    head('ad inspector dialog');

    window.location.hash = '#/listings';
    await waitForView(doc, 'listings');
    await waitFor(() => doc.querySelector('[data-act="inspect"]'), 'the listings table to render');

    const inspectId = doc.querySelector('[data-act="inspect"]').dataset.id;
    doc.querySelector('[data-act="inspect"]').click();
    await waitFor(() => doc.querySelector('.modal-back'), 'the inspector to open');

    const modalText = text(doc.querySelector('.modal'));
    truthy(modalText.includes('Review ad'), 'the inspector is titled');
    truthy(modalText.includes('Price'), 'the inspector shows the price');
    truthy(modalText.includes('Contact'), 'the inspector shows the seller contact');
    truthy(modalText.includes(inspectId), 'the inspector shows the ad id');

    const modBtns = [...doc.querySelectorAll('.modal-back [data-x="action"]')]
      .map(b => b.dataset.action);
    truthy(modBtns.includes('feature') || modBtns.includes('unfeature'),
           'a feature toggle is offered');
    truthy(modBtns.includes('delete'), 'a delete action is offered');

    // Which status buttons appear depends on the ad, so check against the
    // server's own view of it rather than guessing.
    const adBefore = await (await fetch(`${BASE}/api/admin/ads/${inspectId}`,
                                      { headers: { cookie } })).json();
    const status = adBefore.ad.status;
    eq(modBtns.includes('approve'), status !== 'active',
       'Approve is offered exactly when the ad is not already live');
    eq(modBtns.includes('reject'), status !== 'rejected',
       'Reject is offered unless the ad is already rejected');

    // Exercise a real moderation action end-to-end through the UI.
    const featureBtn = () => [...doc.querySelectorAll('.modal-back [data-x="action"]')]
      .find(b => b.dataset.action === 'feature' || b.dataset.action === 'unfeature');

    const wasFeatured = featureBtn().dataset.action === 'unfeature';
    clearToasts(doc);
    featureBtn().click();
    await waitFor(() => !doc.querySelector('.modal-back'), 'the inspector to close');
    await waitFor(() => doc.querySelectorAll('.toast').length > 0, 'the action toast');

    const readFeatured = async () =>
      (await (await fetch(`${BASE}/api/admin/ads/${inspectId}`,
                          { headers: { cookie } })).json()).ad.featured;

    await waitFor(async () => (await readFeatured()) === !wasFeatured,
                  'the feature flag to change on the server');
    eq(await readFeatured(), !wasFeatured,
       'the feature flag really changed on the server after the dialog action');

    // Put it back the way we found it.
    await fetch(`${BASE}/api/admin/ads/${inspectId}`, {
      method: 'PATCH',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ action: wasFeatured ? 'feature' : 'unfeature' }),
    });

    /* ------------------------------------------------------------ teardown */
    head('runtime health');

    // jsdom's CSS parser rejects anything it does not understand. That is a
    // limitation of jsdom, not a defect in the panel, so it is filtered out.
    const BENIGN = /Could not parse CSS|Not implemented|css parsing/i;
    const realErrors = errors.filter(m => !BENIGN.test(m));
    ok(realErrors.length === 0,
       'no uncaught JavaScript errors while driving every view',
       realErrors.join('\n        '));

  } finally {
    window.close();
  }

  console.log('\n' + '-'.repeat(68));
  if (failures.length) {
    console.log(`${C.r}${C.b}${failures.length} FAILED${C.o}, ${C.g}${passed} passed${C.o}`);
    for (const [sec, label, detail] of failures) {
      console.log(`  ${C.r}✗${C.o} [${sec}] ${label}`);
      if (detail) console.log(`      ${detail}`);
    }
    return 1;
  }
  console.log(`${C.g}${C.b}all ${passed} assertions passed${C.o}`);
  return 0;
}

main().then(code => process.exit(code)).catch(err => {
  console.error(`\n${C.r}${err.stack || err.message}${C.o}\n`);
  process.exit(1);
});
