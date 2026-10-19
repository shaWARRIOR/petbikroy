#!/usr/bin/env bash
# Run the whole PetBikroy test suite.
#
# Needs QuickJS (https://bellard.org/quickjs) on PATH, or built next to this repo:
#   curl -O https://bellard.org/quickjs/quickjs-2024-01-13.tar.xz
#   tar xf quickjs-2024-01-13.tar.xz && cd quickjs-2024-01-13 && make qjs
set -uo pipefail

cd "$(dirname "$0")/.."

# Locate the qjs binary: PATH first, then a few common build locations.
QJS="${QJS:-}"
if [ -z "$QJS" ]; then
  if command -v qjs >/dev/null 2>&1; then
    QJS="$(command -v qjs)"
  else
    for cand in "$HOME/quickjs/qjs" ../quickjs-2024-01-13/qjs \
                /tmp/opencode/js/quickjs-2024-01-13/qjs; do
      if [ -x "$cand" ]; then QJS="$cand"; break; fi
    done
  fi
fi

if [ -z "$QJS" ] || [ ! -x "$QJS" ]; then
  echo "error: qjs not found. Set QJS=/path/to/qjs or build QuickJS (see header)." >&2
  exit 127
fi

fail=0
run() {
  local name="$1"; shift
  printf '\n\033[1m── %s ──\033[0m\n' "$name"
  if "$@"; then
    printf '\033[32m%s passed\033[0m\n' "$name"
  else
    printf '\033[31m%s FAILED\033[0m\n' "$name"
    fail=1
  fi
}

run "parse all modules"  "$QJS" --std tests/parse-check.js
run "data layer"         "$QJS" --std tests/test-data.js
run "rendering + UI"     "$QJS" --std tests/test-ui.js
run "post-ad wizard"     "$QJS" --std tests/test-wizard.js

printf '\n\033[1m── generated artwork + html structure ──\033[0m\n'
"$QJS" --std tests/dump-svgs.js || fail=1
python3 tests/validate.py public/index.html public/listings.html public/ad.html \
    public/post.html public/my-ads.html public/favorites.html || fail=1

run "links + assets"     python3 tests/links.py

printf '\n'
if [ "$fail" -eq 0 ]; then
  printf '\033[32m✔ everything green\033[0m\n'
else
  printf '\033[31m✘ some checks failed\033[0m\n'
fi
exit "$fail"
