import * as std from 'std';
const store = {};
globalThis.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k,v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
globalThis.console = { warn: () => {} };
try {
  (0, eval)(std.loadFile('public/assets/js/data.js') + `
const fs = std.open('tests/.svgs.txt', 'w');
let i = 0;
for (const ad of PB.getAllAds()) {
  for (const src of PB.adImages(ad)) {
    const xml = decodeURIComponent(src.replace(/^data:image\\/svg\\+xml;charset=utf-8,/, ''));
    fs.puts('=====' + (i++) + ':' + ad.id + '\\n');
    fs.puts(xml + '\\n');
  }
}
// also the fallback path
const f = PB.adImages({ cat: 'cats' })[0];
fs.puts('=====FB:fallback\\n' + decodeURIComponent(f.replace(/^data:image\\/svg\\+xml;charset=utf-8,/, '')) + '\\n');
fs.close();
print('wrote ' + i + ' svgs');
`);
} catch (e) {
  // Same reason as test-wizard.js: an uncaught throw inside a module leaves
  // the exit code at 0, so it has to be turned into a real failure here.
  print('ERROR: ' + e.message);
  std.exit(1);
}
