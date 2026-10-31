/* Rendering + data-integrity tests. Run with qjs --std */
import * as std from 'std';

const store = {};
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
globalThis.console = { warn: () => {}, log: () => {} };

/* URLSearchParams shim — QuickJS has no URL implementation. */
globalThis.URLSearchParams = class {
  constructor(search) {
    this.map = {};
    const q = String(search || '').replace(/^\?/, '');
    if (!q) return;
    for (const pair of q.split('&')) {
      if (!pair) continue;
      const i = pair.indexOf('=');
      const k = decodeURIComponent(i < 0 ? pair : pair.slice(0, i));
      const v = i < 0 ? '' : decodeURIComponent(pair.slice(i + 1).replace(/\+/g, ' '));
      this.map[k] = v;
    }
  }
  get(k) { return k in this.map ? this.map[k] : null; }
  set(k, v) { this.map[k] = String(v); }
  delete(k) { delete this.map[k]; }
  has(k) { return k in this.map; }
  toString() {
    return Object.keys(this.map)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(this.map[k]))
      .join('&');
  }
};

const dataSrc = std.loadFile('public/assets/js/data.js');
const appSrc  = std.loadFile('public/assets/js/app.js');

const driver = `
let pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) pass++;
  else { fail++; print('  FAIL: ' + name + (extra !== undefined ? ' -> ' + String(extra).slice(0,180) : '')); }
}

print('--- seed data integrity ---');
for (const ad of PB.SEED_ADS) {
  const cat = PB.catById(ad.cat);
  t('valid category: ' + ad.id, !!cat, ad.cat);
  t('sub belongs to category: ' + ad.id, !cat || cat.subs.indexOf(ad.sub) > -1, cat && (ad.sub + ' not in ' + cat.name));
  const loc = PB.locById(ad.loc);
  t('valid division: ' + ad.id, !!loc, ad.loc);
  t('area belongs to division: ' + ad.id, !loc || loc.areas.indexOf(ad.area) > -1, loc && (ad.area + ' not in ' + loc.name));
  t('has title: ' + ad.id, typeof ad.title === 'string' && ad.title.length >= 10, ad.title && ad.title.length);
  t('has description: ' + ad.id, typeof ad.desc === 'string' && ad.desc.length >= 30, ad.desc && ad.desc.length);
  t('price is number: ' + ad.id, typeof ad.price === 'number' && ad.price >= 0, ad.price);
  t('status valid: ' + ad.id, ad.status === 'active' || ad.status === 'sold', ad.status);
  t('created parses: ' + ad.id, !Number.isNaN(new Date(ad.created).getTime()), ad.created);
  t('seller present: ' + ad.id, !!ad.seller && !!ad.seller.name, JSON.stringify(ad.seller));
  t('has artwork seeds: ' + ad.id, Array.isArray(ad.art) && ad.art.length > 0, ad.art && ad.art.length);
  t('views numeric: ' + ad.id, typeof ad.views === 'number', ad.views);
}

print('--- unique ids ---');
const ids = PB.SEED_ADS.map(a => a.id);
t('all ids unique', new Set(ids).size === ids.length, ids.length + ' vs ' + new Set(ids).size);

print('--- every category has at least one sub ---');
PB.CATEGORIES.forEach(c => t('subs for ' + c.id, Array.isArray(c.subs) && c.subs.length > 0));
t('category ids unique', new Set(PB.CATEGORIES.map(c => c.id)).size === PB.CATEGORIES.length);
t('division ids unique', new Set(PB.LOCATIONS.map(l => l.id)).size === PB.LOCATIONS.length);
PB.LOCATIONS.forEach(l => t('areas for ' + l.id, Array.isArray(l.areas) && l.areas.length > 0));

print('--- every category is reachable (has ads or is empty-safe) ---');
const cc = PB.countByCategory();
PB.CATEGORIES.forEach(c => t('count defined for ' + c.id, typeof cc[c.id] === 'number'));

print('--- app.js rendering ---');
t('UI exports', !!UI.adCard && !!UI.renderAds && !!UI.esc);

const sample = PB.getAd('seed-1');
const card = UI.adCard(sample);
t('card has article', card.indexOf('<article class="ad-card"') > -1);
t('card links to ad', card.indexOf('ad.html?id=seed-1') > -1);
t('card shows price', card.indexOf('25,000') > -1, card.slice(0, 400));
t('card shows location', card.indexOf('Dhanmondi') > -1);
t('card has fav button', card.indexOf('data-fav="seed-1"') > -1);
t('card has promoted ribbon', card.indexOf('ribbon') > -1);
t('no undefined in card', card.indexOf('undefined') === -1, card.indexOf('undefined'));
t('no NaN in card', card.indexOf('NaN') === -1);
t('no [object Object]', card.indexOf('[object Object]') === -1);
t('no null in card', card.indexOf('>null<') === -1);
t('img src is data uri', /<img src="data:image\\/svg\\+xml/.test(card));

// Balanced tags in the card markup (rough but catches dropped closers).
const opens = (card.match(/<(article|div|a|span|button|img)\\b/g) || []).length;
const closes = (card.match(/<\\/(article|div|a|span|button)>/g) || []).length;
t('card tags roughly balanced', opens - closes === 1, opens + ' open vs ' + closes + ' close (img is void)');

const sold = PB.getAd('seed-16');
t('sold ad has sold ribbon', UI.adCard(sold).indexOf('ribbon-sold') > -1);

const free = PB.getAd('seed-12');
t('free ad shows Free', UI.adCard(free).indexOf('>Free<') > -1, UI.adCard(free).slice(0, 300));

print('--- render every ad without crashing ---');
let html = '';
for (const ad of PB.getAllAds()) {
  const c = UI.adCard(ad);
  if (c.indexOf('undefined') > -1) { fail++; print('  FAIL: undefined in ' + ad.id); }
  if (c.indexOf('NaN') > -1) { fail++; print('  FAIL: NaN in ' + ad.id); }
  html += c;
}
pass++;
print('  rendered ' + PB.getAllAds().length + ' cards, ' + html.length + ' chars');

print('--- renderAds into a fake host ---');
const host = { innerHTML: '', className: '' };
UI.renderAds(host, PB.newest(3));
t('renderAds sets grid class', host.className === 'grid-listings', host.className);
t('renderAds lists 3 cards', (host.innerHTML.match(/<article class="ad-card"/g) || []).length === 3);
UI.renderAds(host, PB.newest(3), { listView: true });
t('renderAds list view class', host.className === 'grid-listings list-view', host.className);
UI.renderAds(host, []);
t('renderAds empty -> empty state', host.innerHTML.indexOf('No ads found') > -1);
t('empty state resets class', host.className === '', host.className);

print('--- escaping (XSS safety) ---');
const evil = { id: 'x', cat: 'dogs', sub: 'Beagle', title: '<img src=x onerror=alert(1)>', price: 1,
  loc: 'dhaka', area: '<script>bad()</script>', created: new Date().toISOString(),
  seller: { name: '<b>x</b>' }, status: 'active', desc: '</div>' };
const evilCard = UI.adCard(evil);
t('title escaped', evilCard.indexOf('<img src=x') === -1, 'raw tag leaked');
t('area escaped', evilCard.indexOf('<script>') === -1, 'raw script leaked');
t('onerror escaped', evilCard.indexOf('onerror=alert') === -1 || evilCard.indexOf('&lt;img') > -1);
t('esc &', UI.esc('a&b') === 'a&amp;b');
t('esc <', UI.esc('<x>') === '&lt;x&gt;');
t('esc quotes', UI.esc('a"b\\'c') === 'a&quot;b&#39;c');
t('esc null', UI.esc(null) === '');

print('--- icons ---');
Object.keys(UI.ICONS).forEach(k => {
  const s = UI.icon(k);
  t('icon ' + k + ' renders svg', s.indexOf('<svg') === 0 && s.indexOf('</svg>') > 0);
  t('icon ' + k + ' has path content', s.length > 90, s.length);
});

print('--- crumbs ---');
const cr = UI.crumbs([{label:'Home',href:'index.html'},{label:'Dogs',href:'x'},{label:'Final'}]);
t('crumb has nav', cr.indexOf('<nav class="crumbs"') > -1);
t('crumb links first', cr.indexOf('href="index.html"') > -1);
t('last crumb not a link', cr.indexOf('<span>Final</span>') > -1);

print('--- account menu ---');
globalThis.window = globalThis;
window.API = { user: { name: 'Rakib Hasan' }, settled: true, available: true };
const acct = UI.accountSlot();
t('signed-in account is a menu button', acct.indexOf('data-acct-toggle') > -1);
t('account menu starts closed', acct.indexOf('aria-expanded="false"') > -1 && acct.indexOf('data-acct-pop') > -1 && acct.indexOf('hidden') > -1);
t('menu offers My account', acct.indexOf('href="account.html"') > -1 && acct.indexOf('My account') > -1);
t('menu offers My ads', acct.indexOf('href="my-ads.html"') > -1 && acct.indexOf('>My ads<') > -1);
t('menu offers Logout', acct.indexOf('data-signout') > -1 && acct.indexOf('>Logout<') > -1);
t('only one account toggle', (acct.match(/data-acct-toggle/g) || []).length === 1);
t('account button names the user', acct.indexOf('Rakib') > -1);

window.API.user = null;
const guest = UI.accountSlot();
t('signed-out header offers sign in', guest.indexOf('login.html') > -1 && guest.indexOf('data-acct-toggle') === -1);
window.API.user = { name: 'Rakib Hasan' };

print('--- listing page state machine (mirrors listings.js) ---');
function readState(search) {
  const p = new URLSearchParams(search);
  const csv = k => (p.get(k) || '').split(',').map(s => s.trim()).filter(Boolean);
  const num = k => { const r = p.get(k); if (r === null || r === '') return null; const v = Number(r); return Number.isNaN(v) ? null : v; };
  return { q: p.get('q') || '', cat: p.get('cat') || '', subs: csv('sub'), loc: p.get('loc') || '',
    areas: csv('area'), min: num('min'), max: num('max'), sort: p.get('sort') || 'recent',
    sold: p.get('sold') === '1', page: Math.max(1, num('page') || 1),
    view: p.get('view') === 'list' ? 'list' : 'grid' };
}
function apply(st) {
  return PB.search({ q: st.q, cat: st.cat, subs: st.subs, loc: st.loc, areas: st.areas,
    min: st.min, max: st.max, sort: st.sort, includeSold: st.sold });
}

const cases = [
  ['',                                     33],
  ['?cat=dogs',                            8],
  ['?cat=dogs&sub=Beagle',                 1],
  ['?cat=dogs&sub=Beagle,Labrador',        2],
  ['?loc=dhaka',                           19],
  ['?loc=dhaka&area=Dhanmondi',            3],
  ['?q=labrador',                          2],   // puppy + crate (description mentions Labrador)
  ['?cat=cats&q=persian',                  1],
  ['?min=20000&max=30000',                 4],
  ['?sold=1',                              34],
  ['?cat=fish&loc=dhaka',                  2],
  ['?view=list&cat=cats',                  5],
  ['?cat=nonexistent',                     0],
  ['?min=abc',                             33],
  ['?page=99',                             33],
];
for (const [search, expect] of cases) {
  const st = readState(search);
  const got = apply(st).length;
  t('filter "' + search + '" -> ' + expect, got === expect, 'got ' + got);
}

print('--- chips (mirrors listings.js renderChips) ---');
const st2 = readState('?q=cat&cat=dogs&sub=Beagle,Labrador&loc=dhaka&area=Banani&min=100&sold=1');
const chips = [];
if (st2.q) chips.push('q');
if (st2.cat) chips.push('cat');
chips.push(...st2.subs);
if (st2.loc) chips.push('loc');
chips.push(...st2.areas);
if (st2.min != null) chips.push('min');
if (st2.sold) chips.push('sold');
t('all chips present', chips.length === 8, chips.join('|'));

print('--- pagination boundary ---');
const all2 = apply(readState(''));
const PER = 9;
const pages = Math.ceil(all2.length / PER);
for (let p = 1; p <= pages; p++) {
  const slice = all2.slice((p-1)*PER, p*PER);
  t('page ' + p + ' non-empty', slice.length > 0, slice.length);
}
t('page beyond end is empty', all2.slice(pages*PER, (pages+1)*PER).length === 0);
t('no overlap between pages', all2.slice(0,PER)[0].id !== all2.slice(PER,2*PER)[0].id);

print('');
print(pass + ' passed, ' + fail + ' failed');
if (fail > 0) throw new Error('TEST FAILURES');
`;

try {
  (0, eval)(dataSrc + '\n' + appSrc + '\n' + driver);
} catch (e) {
  print('ERROR: ' + e.message);
  if (e.stack) print(e.stack);
  std.exit(1);
}
