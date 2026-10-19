#!/usr/bin/env bash
# ============================================================================
# Runs the API integration tests against a live server.
#
# Wraps tests/api-tests.py with the housekeeping that repeated runs need:
#   * checks the server is actually up
#   * clears the per-IP rate-limit counters (the suite posts a lot of ads)
#   * removes any ads a previous crashed run left behind
#
#   ./tests/run-api-tests.sh                       # local
#   ./tests/run-api-tests.sh https://your.site     # deployed
#
# The state reset is skipped for non-local targets — it must never touch
# production data.
# ============================================================================
set -uo pipefail

BASE="${1:-http://127.0.0.1:8788}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="${PB_DB:-petbikroy}"

# Tests identify their own ads by this contact email, so leftovers are easy
# to find without matching on titles.
TEST_EMAIL="seller@example.com"

# Members the suite registers get numbers in this range, which no seeded or
# real account uses, so a crashed run's accounts (and their ads) are easy to
# remove.
TEST_PHONE_PREFIX="019000"

# Production default for the hourly posting limit, restored after the run.
# The suite deliberately posts a lot of ads (many of them invalid), so it
# needs more headroom than a real visitor ever would.
PROD_POST_LIMIT="${PB_POST_LIMIT:-10}"
TEST_POST_LIMIT=200

# The same for sign-ups: the suite deliberately walks the registration form
# through every validation failure.
PROD_SIGNUP_LIMIT="${PB_SIGNUP_LIMIT:-10}"
TEST_SIGNUP_LIMIT=200

WRANGLER_BIN=""
LOCAL=0
if [[ "$BASE" == *localhost* || "$BASE" == *127.0.0.1* || "$BASE" == *"[::1]"* ]]; then
  LOCAL=1
fi

restore_state() {
  [[ -n "$WRANGLER_BIN" && "$LOCAL" == "1" ]] || return 0
  "$WRANGLER_BIN" d1 execute "$DB" --local --command \
    "INSERT INTO settings (key, value, updated_at) VALUES ('post_limit', '${PROD_POST_LIMIT}', '${NOW}')
     ON CONFLICT(key) DO UPDATE SET value = '${PROD_POST_LIMIT}';
     INSERT INTO settings (key, value, updated_at) VALUES ('signup_limit', '${PROD_SIGNUP_LIMIT}', '${NOW}')
     ON CONFLICT(key) DO UPDATE SET value = '${PROD_SIGNUP_LIMIT}';" >/dev/null 2>&1
}
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "PetBikroy API test runner"
echo "  target  $BASE"

# ---------------------------------------------------------------- server up?
if ! curl -fsS --max-time 5 "$BASE/api/stats" >/dev/null 2>&1; then
  echo
  echo "  No API responding at $BASE"
  echo "  Start it first:  npm run dev"
  echo
  exit 2
fi

# --------------------------------------------------------------- local reset
if [[ "$LOCAL" == "1" ]]; then
  WRANGLER_BIN="${WRANGLER:-}"
  if [[ -z "$WRANGLER_BIN" ]]; then
    if [[ -x "$ROOT/node_modules/.bin/wrangler" ]]; then
      WRANGLER_BIN="$ROOT/node_modules/.bin/wrangler"
    elif command -v wrangler >/dev/null 2>&1; then
      WRANGLER_BIN="$(command -v wrangler)"
    fi
  fi

  if [[ -n "$WRANGLER_BIN" ]]; then
    SQL="DELETE FROM rate_limits;
         DELETE FROM audit_log;
         DELETE FROM ads WHERE contact_email = '${TEST_EMAIL}';
         DELETE FROM ads
           WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '${TEST_PHONE_PREFIX}%');
         DELETE FROM ad_photos WHERE ad_id NOT IN (SELECT id FROM ads);
         DELETE FROM reports WHERE ad_id NOT IN (SELECT id FROM ads);
         DELETE FROM users WHERE phone LIKE '${TEST_PHONE_PREFIX}%';
         DELETE FROM sessions
           WHERE kind = 'user'
             AND user_id NOT IN (SELECT id FROM users);
         INSERT INTO settings (key, value, updated_at) VALUES ('post_limit', '${TEST_POST_LIMIT}', '${NOW}')
           ON CONFLICT(key) DO UPDATE SET value = '${TEST_POST_LIMIT}';
         INSERT INTO settings (key, value, updated_at) VALUES ('signup_limit', '${TEST_SIGNUP_LIMIT}', '${NOW}')
           ON CONFLICT(key) DO UPDATE SET value = '${TEST_SIGNUP_LIMIT}';"
    if RESET_OUT=$("$WRANGLER_BIN" d1 execute "$DB" --local --command "$SQL" 2>&1); then
      echo "  reset    cleared rate limits, login counters and stale test data"
      echo "  note     limits raised for the run (ads ${TEST_POST_LIMIT}, sign-ups ${TEST_SIGNUP_LIMIT}), restored to ${PROD_POST_LIMIT}/${PROD_SIGNUP_LIMIT} at exit"
      trap restore_state EXIT
    else
      # Usually an unreachable Node binary or a missing local database.
      # Worth showing: silently skipping this is a confusing failure later.
      echo "  note     could not reset local state; the suite may hit rate limits"
      echo "           $(echo "$RESET_OUT" | grep -viE '^\s*$' | tail -2 | tr '\n' ' ')"
    fi
  else
    echo "  note    wrangler not found; skipping the local state reset"
  fi
else
  echo "  note    remote target — no state reset performed"
fi

echo
exec python3 "$ROOT/tests/api-tests.py" "$BASE"
