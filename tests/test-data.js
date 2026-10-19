/* Data-layer test driver. Run as: qjs --std build.js  (concatenates mocks + data.js + tests) */
import * as std from 'std';

/* ---- minimal browser mocks ---- */
const store = {};
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
globalThis.console = { warn: (...a) => print('WARN ' + a.join(' ')), log: () => {} };

const dataSrc = std.loadFile('public/assets/js/data.js');

const driver = `
/* ============================ TESTS ============================ */
let pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; print('  FAIL: ' + name + (extra !== undefined ? '  -> ' + extra : '')); }
}

print('--- seed dataset ---');
const all = PB.getAllAds();
t('seeds load', all.length === 34, all.length);

print('--- search ---');
t('all active', PB.search({}).length === 33, PB.search({}).length);
t('includeSold', PB.search({includeSold:true}).length === 34, PB.search({includeSold:true}).length);
t('cat=dogs', PB.search({cat:'dogs'}).every(a => a.cat === 'dogs'));
t('cat=dogs count', PB.search({cat:'dogs'}).length === 8, PB.search({cat:'dogs'}).length);
t('sub filter', PB.search({cat:'cats', subs:['Persian']}).length === 1);
t('loc filter', PB.search({loc:'dhaka'}).every(a => a.loc === 'dhaka'));
t('area filter', PB.search({loc:'dhaka', areas:['Dhanmondi']}).every(a => a.area === 'Dhanmondi'));
t('q=labrador', PB.search({q:'labrador'}).length >= 1, PB.search({q:'labrador'}).length);
t('q multi-word', PB.search({q:'persian cat'}).length >= 1);
t('q no match', PB.search({q:'zzzznotathing'}).length === 0);
t('price min', PB.search({min:40000}).every(a => a.price >= 40000));
t('price max', PB.search({max:1000}).every(a => a.price <= 1000));
t('price range', PB.search({min:5000, max:12000}).every(a => a.price >= 5000 && a.price <= 12000));

print('--- sorting ---');
const asc = PB.search({sort:'price-asc'}).map(a => a.price);
const ascOk = asc.every((v,i) => i === 0 || asc[i-1] <= v);
t('price-asc sorted', ascOk, asc.join(','));
const desc = PB.search({sort:'price-desc'}).map(a => a.price);
t('price-desc sorted', desc.every((v,i) => i === 0 || desc[i-1] >= v));
const pop = PB.search({sort:'popular'}).map(a => a.views);
t('popular sorted', pop.every((v,i) => i === 0 || pop[i-1] >= v));
const rec = PB.search({sort:'recent'}).filter(a => !a.featured).map(a => +new Date(a.created));
t('recent sorted within non-promoted', rec.every((v,i) => i === 0 || rec[i-1] >= v));
t('featured float on recent', PB.search({sort:'recent'}).slice(0,4).every(a => a.featured));

print('--- counts ---');
const cc = PB.countByCategory();
t('countByCategory dogs', cc.dogs === 8, cc.dogs);
t('countByCategory excludes sold', (cc['small-pets'] || 0) === 3, cc['small-pets']);
const sc = PB.countBySub('dogs');
t('countBySub dogs', Object.keys(sc).length === 8, JSON.stringify(sc));
const lc = PB.countByLocation();
t('countByLocation', Object.keys(lc).length >= 5, JSON.stringify(lc));

print('--- helpers ---');
t('catName', PB.catName('dogs') === 'Dogs');
t('catEmoji', PB.catEmoji('birds') === '\\u{1F99C}' || PB.catEmoji('birds').length > 0);
t('locName', PB.locName('dhaka') === 'Dhaka');
const p1 = PB.formatPrice(25000, true);
t('formatPrice groups thousands', p1.text === '\u09F325,000', p1.text);
t('group 0', PB.group(0) === '0', PB.group(0));
t('group 999', PB.group(999) === '999', PB.group(999));
t('group 1000', PB.group(1000) === '1,000', PB.group(1000));
t('group 1234567', PB.group(1234567) === '1,234,567', PB.group(1234567));
t('group non-numeric', PB.group(undefined) === '0', PB.group(undefined));
t('formatPrice free', PB.formatPrice(0).free === true);
t('formatPrice null', PB.formatPrice(null).free === true);
t('timeAgo', /ago/.test(PB.timeAgo(new Date(Date.now()-3600000).toISOString())), PB.timeAgo(new Date(Date.now()-3600000).toISOString()));
t('formatDate', PB.formatDate('2026-10-15T09:20:00+06:00').length > 0);
const ph = PB.placeholder('\\u{1F415}', {n:3, s:'#23a455'});
t('placeholder is svg data uri', ph.indexOf('data:image/svg+xml') === 0, ph.slice(0,30));
t('adImages seeds', PB.adImages(all[0]).length === 3, PB.adImages(all[0]).length);
t('adImages fallback', PB.adImages({cat:'dogs'}).length === 1);
t('adCover', typeof PB.adCover(all[0]) === 'string');
t('matchesQuery', PB.matchesQuery(all[0], 'labrador') === true);

print('--- pagination maths (mirrors listings.js) ---');
const res = PB.search({sort:'recent'});
const PER = 9;
const pages = Math.ceil(res.length / PER);
t('page count', pages === 4, pages + ' pages for ' + res.length);
t('last page size', res.slice((pages-1)*PER, pages*PER).length === res.length - (pages-1)*PER);

print('--- similar / featured / newest ---');
t('similar excludes self', PB.similar(all[0], 4).every(a => a.id !== all[0].id));
t('similar same cat', PB.similar(all[0], 4).every(a => a.cat === all[0].cat));
t('newest 8', PB.newest(8).length === 8);
t('featured 4', PB.featured(4).length === 4);
const st = PB.stats();
t('stats.ads', st.ads === 33, st.ads);
t('stats.categories', st.categories === 10, st.categories);

print('--- persistence: post an ad ---');
const before = PB.getAllAds().length;
const ad = {
  id: PB.newId(), cat:'dogs', sub:'Beagle', title:'Test puppy ad for sale',
  price: 12345, negotiable: true, loc:'dhaka', area:'Banani', age:'2 months',
  gender:'Male', vaccinated:true, condition:'New', views:0, featured:false,
  status:'active', created:new Date().toISOString(),
  seller:{name:'Test User', joined:new Date().toISOString(), verified:false, ads:1},
  phone:'01711111111', email:'', photos:[], desc:'A'.repeat(60),
};
t('saveAd returns true', PB.saveAd(ad) === true);
t('getAllAds grew by 1', PB.getAllAds().length === before + 1, PB.getAllAds().length);
t('isUserAd', PB.isUserAd(ad.id) === true);
t('isUserAd false for seed', PB.isUserAd('seed-1') === false);
t('getAd finds it', PB.getAd(ad.id) !== null);
t('new ad is the newest non-promoted', PB.search({sort:'recent'}).filter(a => !a.featured)[0].id === ad.id);
t('new ad in cat filter', PB.search({cat:'dogs'}).some(a => a.id === ad.id));
t('new ad matches q', PB.search({q:'beagle'}).some(a => a.id === ad.id));
t('new ad matches area', PB.search({loc:'dhaka', areas:['Banani']}).some(a => a.id === ad.id));
t('photos empty -> artwork', PB.adCover(ad).indexOf('data:image') === 0);

print('--- persistence: edit ---');
ad.status = 'sold';
PB.saveAd(ad);
t('edit persists', PB.getAd(ad.id).status === 'sold');
t('sold hidden by default', !PB.search({}).some(a => a.id === ad.id));
t('sold shown when asked', PB.search({includeSold:true}).some(a => a.id === ad.id));
t('no duplicate on re-save', PB.getUserAds().length === 1, PB.getUserAds().length);

print('--- persistence: delete ---');
PB.deleteAd(ad.id);
t('user ad removed', PB.getAd(ad.id) === null);
t('back to seed count', PB.getAllAds().length === before, PB.getAllAds().length);

print('--- hidden seed ads ---');
PB.deleteAd('seed-9');
t('seed ad hidden', PB.getAd('seed-9') === null);
t('other seeds remain', PB.getAllAds().length === before - 1);
PB.deleteAd('seed-9');
t('delete seed is idempotent', PB.getAllAds().length === before - 1);

print('--- favourites ---');
t('starts empty', PB.getFavorites().length === 0);
t('toggle adds', PB.toggleFavorite('seed-1') === true);
t('isFavorite', PB.isFavorite('seed-1') === true);
t('toggle removes', PB.toggleFavorite('seed-1') === false);
t('isFavorite false', PB.isFavorite('seed-1') === false);
PB.toggleFavorite('seed-1'); PB.toggleFavorite('seed-2');
t('two saved', PB.getFavorites().length === 2);
t('newest first', PB.getFavorites()[0] === 'seed-2');
t('clearFavorites', PB.clearFavorites() === true && PB.getFavorites().length === 0);

print('--- preferred location ---');
PB.setPrefLocation('khulna');
t('pref loc saved', PB.getPrefLocation() === 'khulna');

print('--- rendering helpers (app.js logic) ---');
// Re-implement the critical price markup branch to confirm no crash on edge prices.
[0, null, 1, 999999999].forEach(v => {
  const r = PB.formatPrice(v);
  t('formatPrice(' + v + ') safe', typeof r.text === 'string');
});

print('');
print(pass + ' passed, ' + fail + ' failed');
if (fail > 0) throw new Error('TEST FAILURES');
`;

const combined = `
globalThis.localStorage = globalThis.localStorage;
${dataSrc}
${driver}
`;

try {
  (0, eval)(combined);
} catch (e) {
  print('ERROR: ' + e.message);
  if (e.stack) print(e.stack);
  std.exit(1);
}
