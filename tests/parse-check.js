/* ==========================================================================
   Every browser module must parse.

   The file list is discovered rather than written out by hand. A hardcoded
   list is how api.js — the one module every page now depends on — spent a
   while going unchecked.
   ========================================================================== */

import * as std from 'std';
import * as os from 'os';

const DIR = 'public/assets/js';

// os.readdir returns a [entries, error] pair, not a bare array.
const [entries, err] = os.readdir(DIR);
if (err) {
  print('cannot read ' + DIR + ' (error ' + err + ')');
  std.exit(1);
}

const files = entries.filter(n => n.endsWith('.js')).sort();
if (!files.length) {
  print('no modules found in ' + DIR);
  std.exit(1);
}

let bad = 0;
for (const name of files) {
  const path = DIR + '/' + name;
  const src = std.loadFile(path);
  if (src === null) { print('MISSING ' + path); bad++; continue; }
  try {
    // Parsing as a function body throws a SyntaxError on bad syntax.
    new Function(src);
    print('ok   ' + path);
  } catch (e) {
    print('FAIL ' + path + ' -> ' + e.name + ': ' + e.message);
    bad++;
  }
}

print('');
if (bad) {
  // Exiting non-zero is the whole point: without this the runner reports
  // "passed" no matter how many modules failed.
  print(bad + ' module(s) failed to parse');
  std.exit(1);
}

print('All ' + files.length + ' modules parse cleanly');
