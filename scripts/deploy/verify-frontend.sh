#!/usr/bin/env bash
# Prove that a frontend URL is serving a given commit.
#
# Usage:   scripts/deploy/verify-frontend.sh <base-url> <sha> [timeout-minutes]
#
# Passes when, within the timeout, GET <base>/ returns 200 and the HTML contains
#   <meta name="build-sha" content="<sha>">
# (rendered by apps/inventory/app/root.tsx from VITE_BUILD_SHA at build time).

# shellcheck source=scripts/deploy/lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

BASE=${1:-}
SHA=${2:-}
TIMEOUT_MIN=${3:-5}
[[ -n "$BASE" ]] || die "usage: verify-frontend.sh <base-url> <sha> [timeout-minutes]"
require_sha "$SHA"
require_cmd curl
BASE=${BASE%/}

LAST_REASON=""
LAST_SEEN=""
serving_sha() {
  http_json GET "${BASE}/" --header 'Accept: text/html' --header 'Cache-Control: no-cache'
  if ! is_2xx; then
    LAST_REASON="GET ${BASE}/ returned HTTP ${HTTP_STATUS}"
    return 1
  fi
  # Match either attribute order; tolerate extra whitespace.
  if grep -Eq "<meta[^>]*name=\"build-sha\"[^>]*content=\"${SHA}\"|<meta[^>]*content=\"${SHA}\"[^>]*name=\"build-sha\"" <<<"$HTTP_BODY"; then
    return 0
  fi
  LAST_SEEN=$(grep -Eo '<meta[^>]*name="build-sha"[^>]*>' <<<"$HTTP_BODY" | grep -Eo 'content="[^"]*"' | head -1 | sed -E 's/content="([^"]*)"/\1/')
  LAST_REASON="page serves build-sha '${LAST_SEEN:-<missing>}', expected '${SHA}'"
  return 1
}

log "verify: waiting up to ${TIMEOUT_MIN}m for ${BASE} to serve ${SHA}"
poll 10 "$TIMEOUT_MIN" serving_sha || die "verification failed after ${TIMEOUT_MIN}m: ${LAST_REASON}"
log "verify: ${BASE} is live on ${SHA}"
emit_output verified_sha "$SHA"
