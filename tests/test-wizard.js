/* Wizard logic + publish round-trip tests. */
import * as std from 'std';

const store = {};
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
globalThis.console = { warn: () => {} };

// Wrapped in try/catch deliberately: QuickJS leaves the exit code at 0 when an
// uncaught exception escapes a *module*, so a bare eval that throws would be
// reported as "passed" by the runner no matter how many assertions failed.
try {
  (0, eval)(std.loadFile('public/assets/js/wizard.js') + '\n' + std.loadFile('public/assets/js/data.js') + `
let pass = 0, fail = 0;
function t(name, cond, extra) {
  if (cond) pass++;
  else { fail++; print('  FAIL: ' + name + (extra !== undefined ? ' -> ' + String(extra).slice(0,200) : '')); }
}
const ids = r => r.errors.slice().sort().join(',');

print('--- blank draft ---');
const b = Wizard.blank();
t('blank has all keys', ['cat','sub','kind','title','photos','price','negotiable','desc','age','gender','condition','vaccinated','loc','area','name','phone','email'].every(k => k in b));
t('blank is invalid step1', Wizard.validateStep(1, b).ok === false);
t('blank step1 error', ids(Wizard.validateStep(1, b)) === 'cat');
t('photos is array', Array.isArray(b.photos) && b.photos.length === 0);

print('--- step 1: category ---');
let d = Wizard.blank();
d.cat = 'dogs';
t('cat only -> needs sub', ids(Wizard.validateStep(1, d)) === 'sub');
d.sub = 'Labrador';
t('cat+sub valid', Wizard.validateStep(1, d).ok === true, ids(Wizard.validateStep(1, d)));

print('--- step 2: details ---');
d = Wizard.blank(); d.cat='dogs'; d.sub='Beagle';
d.title = 'short';
t('short title rejected', ids(Wizard.validateStep(2, d)).indexOf('title') > -1);
d.title = 'Ten char+';           // exactly 9 -> still short
t('9 char title rejected', ids(Wizard.validateStep(2, d)).indexOf('title') > -1, d.title.length);
d.title = 'Ten chars+';          // exactly 10 -> ok
t('10 char title accepted', ids(Wizard.validateStep(2, d)).indexOf('title') === -1, d.title.length);
d.title = '   padded   ';        // trim then length 6 -> rejected
t('whitespace title trimmed', ids(Wizard.validateStep(2, d)).indexOf('title') > -1);
d.title = 'A valid pet ad title';

d.price = null;
t('null price rejected (sale)', ids(Wizard.validateStep(2, d)).indexOf('price') > -1);
d.price = '';
t('empty price rejected (sale)', ids(Wizard.validateStep(2, d)).indexOf('price') > -1);
d.price = -5;
t('negative price rejected', ids(Wizard.validateStep(2, d)).indexOf('price') > -1);
d.price = 0;
t('zero price accepted (sale)', ids(Wizard.validateStep(2, d)).indexOf('price') === -1, ids(Wizard.validateStep(2, d)));
d.price = 25000;

t('short desc rejected', ids(Wizard.validateStep(2, d)).indexOf('desc') > -1);
d.desc = 'x'.repeat(29);
t('29 char desc rejected', ids(Wizard.validateStep(2, d)).indexOf('desc') > -1);
d.desc = 'x'.repeat(30);
t('30 char desc accepted', Wizard.validateStep(2, d).ok === true, ids(Wizard.validateStep(2, d)));

// adoption needs no price
const adopt = { ...d, kind: 'adoption', price: null };
t('adoption skips price', Wizard.validateStep(2, adopt).ok === true, ids(Wizard.validateStep(2, adopt)));
t('priceFor adoption = 0', Wizard.priceFor(adopt) === 0);
t('priceFor sale = 25000', Wizard.priceFor(d) === 25000);

print('--- step 3: location & contact ---');
d = { ...d, title: 'A valid pet ad title', desc: 'x'.repeat(30) };
t('missing loc', ids(Wizard.validateStep(3, d)) === 'area,loc,name,phone', ids(Wizard.validateStep(3, d)));
d.loc = 'dhaka';
t('missing area only', ids(Wizard.validateStep(3, d)) === 'area,name,phone', ids(Wizard.validateStep(3, d)));
d.area = 'Mirpur';
t('missing name+phone', ids(Wizard.validateStep(3, d)) === 'name,phone', ids(Wizard.validateStep(3, d)));
d.name = 'X';
t('1-char name rejected', ids(Wizard.validateStep(3, d)).indexOf('name') > -1);
d.name = 'Rakib Hasan';
t('valid name', ids(Wizard.validateStep(3, d)) === 'phone', ids(Wizard.validateStep(3, d)));

// Bangladeshi mobile numbers
const phones = [
  ['01712345678', true], ['01912345678', true], ['01312345678', true],
  ['01512345678', true], ['01612345678', true], ['01812345678', true],
  ['0171234567',  false],  // 10 digits
  ['017123456789', false], // 12 digits
  ['01212345678', false],  // 012 not a mobile prefix
  ['01112345678', false],
  ['0171-234 5678', true], // formatted -> digits normalise
  ['+8801712345678', false], // 880 prefix + 0171... = 13 digits
  ['', false],
  ['abcdefghijk', false],
  ['01712abc678', false],
];
for (const [input, ok] of phones) {
  const r = Wizard.validateStep(3, { ...d, phone: input });
  t('phone "' + input + '" -> ' + ok, (r.errors.indexOf('phone') === -1) === ok,
    r.errors.join(','));
}

const emails = [
  ['', true], ['a@b.co', true], ['someone@example.com', true],
  ['bad@', false], ['@bad.com', false], ['no-at-sign', false],
  ['a@b.c', false], ['a b@c.com', false],
];
for (const [input, ok] of emails) {
  const r = Wizard.validateStep(3, { ...d, email: input });
  t('email "' + input + '" -> ' + ok, (r.errors.indexOf('email') === -1) === ok, r.errors.join(','));
}

t('full step3 valid', Wizard.validateStep(3, { ...d, phone: '01712345678' }).ok === true);

print('--- step 4: terms ---');
const full = { ...d, phone: '01712345678' };
t('terms missing -> error', ids(Wizard.validateStep(4, full, {})) === 'terms');
t('terms false -> error', ids(Wizard.validateStep(4, full, { terms: false })) === 'terms');
t('terms true -> ok', Wizard.validateStep(4, full, { terms: true }).ok === true);

print('--- validateAll ---');
t('validateAll on blank', Wizard.validateAll(Wizard.blank(), 4, {}).ok === false);
t('validateAll finds all 9 gaps', Wizard.validateAll(Wizard.blank(), 4, {}).errors.length === 9,
  Wizard.validateAll(Wizard.blank(), 4, {}).errors.join(','));
t('validateAll passes complete', Wizard.validateAll(full, 4, { terms: true }).ok === true,
  Wizard.validateAll(full, 4, { terms: true }).errors.join(','));

print('--- isAnimalCategory ---');
t('dogs is animal', Wizard.isAnimalCategory('dogs') === true);
t('accessories not animal', Wizard.isAnimalCategory('accessories') === false);
t('food not animal', Wizard.isAnimalCategory('food') === false);
t('services not animal', Wizard.isAnimalCategory('services') === false);
t('empty not animal', Wizard.isAnimalCategory('') === false);

print('--- buildAd ---');
const built = Wizard.buildAd(full, { id: 'u-test1', existingCount: 2 });
t('id passed through', built.id === 'u-test1');
t('title trimmed', built.title === 'A valid pet ad title');
t('price numeric', built.price === 25000 && typeof built.price === 'number');
t('phone digits only', built.phone === '01712345678', built.phone);
t('status active', built.status === 'active');
t('views 0', built.views === 0);
t('featured false', built.featured === false);
t('seller ads count', built.seller.ads === 3, built.seller.ads);
t('seller verified false', built.seller.verified === false);
t('created is iso', !Number.isNaN(new Date(built.created).getTime()));
t('desc trimmed', built.desc === 'x'.repeat(30));
t('photos copied not shared', built.photos !== full.photos);
t('no undefined fields', Object.values(built).every(v => v !== undefined));

// trimmed whitespace everywhere
const messy = Wizard.buildAd({
  ...full, title: '   Spaced out title   ', name: '  Rakib  ', phone: '0171-234 5678',
  age: '  3 months  ', email: '  a@b.co  ',
}, { id: 'u-2' });
t('messy title trimmed', messy.title === 'Spaced out title', JSON.stringify(messy.title));
t('messy name trimmed', messy.seller.name === 'Rakib');
t('messy phone normalised', messy.phone === '01712345678', messy.phone);
t('messy age trimmed', messy.age === '3 months');
t('messy email trimmed', messy.email === 'a@b.co');

// a built ad must satisfy the data layer's own filters
print('--- publish round-trip through the data layer ---');
const ad = Wizard.buildAd(full, { id: 'u-rt', existingCount: 0 });
t('saveAd succeeds', PB.saveAd(ad) === true);
t('getAd finds it', PB.getAd('u-rt') !== null);
t('isUserAd true', PB.isUserAd('u-rt') === true);
t('appears in category', PB.search({ cat: 'dogs' }).some(a => a.id === 'u-rt'));
t('appears in sub filter', PB.search({ cat: 'dogs', subs: ['Beagle'] }).some(a => a.id === 'u-rt'));
t('appears in location', PB.search({ loc: 'dhaka' }).some(a => a.id === 'u-rt'));
t('appears in area', PB.search({ loc: 'dhaka', areas: ['Mirpur'] }).some(a => a.id === 'u-rt'));
t('findable by title words', PB.search({ q: 'valid pet' }).some(a => a.id === 'u-rt'));
t('findable by breed', PB.search({ q: 'beagle' }).some(a => a.id === 'u-rt'));
t('price filter matches', PB.search({ min: 20000, max: 30000 }).some(a => a.id === 'u-rt'));
t('not featured so not floated', PB.search({ sort: 'recent' }).filter(a => !a.featured)[0].id === 'u-rt');
t('cover artwork generated', PB.adCover(ad).indexOf('data:image/svg') === 0);
t('timeAgo works on new ad', PB.timeAgo(ad.created).indexOf('ago') > -1, PB.timeAgo(ad.created));
t('category count grew', PB.countByCategory().dogs === 9, PB.countByCategory().dogs);

print('--- adoption round-trip ---');
const adoptAd = Wizard.buildAd({ ...full, kind: 'adoption', price: 999 }, { id: 'u-free' });
t('adoption price forced to 0', adoptAd.price === 0, adoptAd.price);
PB.saveAd(adoptAd);
t('adoption saved', PB.getAd('u-free') !== null);
t('formatPrice says Free', PB.formatPrice(PB.getAd('u-free').price).free === true);
t('adoption in search', PB.search({ cat: 'dogs' }).some(a => a.id === 'u-free'));

print('--- photos ---');
const d2 = Wizard.blank();
t('photoRoom starts at 6', Wizard.photoRoom(d2) === 6);
d2.photos = ['a','b','c'];
t('photoRoom after 3', Wizard.photoRoom(d2) === 3);
d2.photos = ['a','b','c','d','e','f'];
t('photoRoom at cap', Wizard.photoRoom(d2) === 0);
d2.photos = ['a','b','c','d','e','f','g'];
t('photoRoom never negative', Wizard.photoRoom(d2) === 0);
t('accepts small jpeg', Wizard.photoAccepted({ type: 'image/jpeg', size: 1000 }) === true);
t('accepts png at limit', Wizard.photoAccepted({ type: 'image/png', size: Wizard.MAX_BYTES }) === true);
t('rejects over limit', Wizard.photoAccepted({ type: 'image/png', size: Wizard.MAX_BYTES + 1 }) === false);
t('rejects non-image', Wizard.photoAccepted({ type: 'application/pdf', size: 10 }) === false);
t('rejects empty', Wizard.photoAccepted({}) === false);
t('rejects null', Wizard.photoAccepted(null) === false);
const withPhoto = PB.getAd('u-rt');
t('photos empty -> artwork not array leak', Array.isArray(withPhoto.photos));

print('');
print(pass + ' passed, ' + fail + ' failed');
if (fail > 0) throw new Error('TEST FAILURES');
`);
} catch (e) {
  print('ERROR: ' + e.message);
  if (e.stack) print(e.stack);
  std.exit(1);
}
