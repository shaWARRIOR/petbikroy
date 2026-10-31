/* jsdom harness: load my-ads.html with real script execution, proxy fetch to
   the dev server, observe what renders. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { JSDOM, VirtualConsole } from 'jsdom';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONT = path.resolve(__dirname, 'frontend');
const BASE = process.env.BASE || 'http://127.0.0.1:8799/';

const realFetch = globalThis.fetch;
const cookies = new Map();
function setCookiesFrom(res) {
  const set = res.headers.get('set-cookie') || '';
  // only the first token is name=value; the rest are attributes
  const first = set.split(';')[0];
  const eq = first.indexOf('=');
  if (eq >= 0) {
    cookies.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim());
  }
}
globalThis.fetch = async (url, opts = {}) => {
  const abs = new URL(url, BASE).toString();
  const headers = { ...(opts.headers || {}) };
  // force-send the session cookie (bypass Secure over HTTP, like a dev browser)
  const h = [...cookies.entries()].filter(([k]) => k === 'pb_user').map(([k, v]) => `${k}=${v}`).join('; ');
  if (h) headers['cookie'] = h;
  // jsdom's AbortController is incompatible with Node's fetch, which makes the
  // reachability probe throw — a harness artifact. Fake a healthy probe.
  if (abs.endsWith('/api/stats')) {
    return new Response(JSON.stringify({ ads: 30, sold: 1, categories: 10, locations: 8, views: 21047 }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  }
  const res = await realFetch(abs, { ...opts, headers });
  const body = await res.text();
  setCookiesFrom({ headers: { get: (n) => res.headers.get(n) } });
  if (process.env.DEBUG) {
    try { const u = new URL(abs); console.log('[fetch]', opts.method || 'GET', u.pathname, '->', res.status, 'sent-cookie=', !!headers.cookie, 'body=', body.slice(0, 90)); } catch {}
  }
  return new Response(body, { status: res.status, headers: Object.fromEntries(res.headers.entries()) });
};

async function getText(url) {
  return (await fetch(url)).text();
}

async function main() {
  // login
  const loginRes = await fetch(`${BASE}api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone: '01311000000', password: 'petbikroy123' }),
  });
  const login = JSON.parse(await loginRes.text());
  console.log('LOGIN:', login.user ? login.user.id : 'NO USER');
  console.log('COOKIE jar:', [...cookies.keys()].join(', ') || '(empty)');

  const html = await getText(`${BASE}my-ads.html`);

  // Replace <script src> with inline scripts so jsdom runs them in order.
  const dom = new JSDOM(html, {
    url: `${BASE}/my-ads.html`,
    runScripts: 'dangerously',
    virtualConsole: new VirtualConsole().on('jsdomError', e => console.log('jsdomError:', e.message)),
  });
  const { window } = dom;

  // inject fetch polyfill before scripts run
  window.fetch = globalThis.fetch;

  const scriptEls = [...window.document.querySelectorAll('script[src]')];
  for (const s of scriptEls) {
    const code = await getText(`${BASE}${s.getAttribute('src')}`);
    const inline = window.document.createElement('script');
    inline.textContent = code;
    s.parentNode.replaceChild(inline, s);
  }

  // let async boot settle
  await new Promise(r => setTimeout(r, 2000));

  const host = window.document.querySelector('#tableHost');
  const text = host ? host.textContent.slice(0, 120) : '(no #tableHost)';
  const hasSkeleton = !!window.document.querySelector('.skeleton');
  const rows = window.document.querySelectorAll('#tableHost tbody tr');
  const noticeRows = window.document.querySelectorAll('#tableHost .notice-row');
  console.log('TABLETEXT:', JSON.stringify(text));
  console.log('HAS_SKELETON:', hasSkeleton, '| DATA ROWS:', rows.length, '| NOTICE ROWS:', noticeRows.length);
  console.log('API.available:', window.API && window.API.available);
  console.log('API.settled:', window.API && window.API.settled);
  console.log('API.user:', window.API && window.API.user ? window.API.user.id : 'null');
}

main().then(() => process.exit(0)).catch(e => { console.error('HARNESS ERROR:', e.stack); process.exit(1); });
