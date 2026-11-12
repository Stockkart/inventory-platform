#!/usr/bin/env bash
# Build the frontend for one Vercel project and deploy it to that project's main
# domain ("production" in Vercel's vocabulary, which is our staging OR our
# production depending on VERCEL_PROJECT_ID).
#
# Usage:   scripts/deploy/vercel-deploy.sh <sha>
#
# Environment:
#   VERCEL_TOKEN        Vercel token (secret)
#   VERCEL_ORG_ID       Vercel team/org id
#   VERCEL_PROJECT_ID   Vercel project id — selects staging vs production project
#
# Outputs: deployment_url (the unique *.vercel.app URL of this deployment),
#          previous_sha   (sha meta of the deployment that was live before, if any)
#
# Must run from the repository root with dependencies installed (pnpm install) and
# the Vercel CLI on PATH. Steps:
#   1. vercel pull   – fetch the project's settings and build-time env (VITE_API_URL …)
#   2. vercel build  – build locally with VITE_BUILD_SHA=<sha> so the page carries the sha
#   3. vercel deploy --prebuilt --prod – upload the output; Vercel assigns the project domain
# https://vercel.com/docs/cli/build  https://vercel.com/docs/cli/deploy

# shellcheck source=scripts/deploy/lib.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

SHA=${1:-}
require_sha "$SHA"
require_env VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID
require_cmd vercel

export VERCEL_ORG_ID VERCEL_PROJECT_ID
export VITE_BUILD_SHA="$SHA"

# --- 0. remember what is live now (for the rollback hint) --------------------
PREVIOUS_SHA=""
if command -v jq >/dev/null 2>&1; then
  http_json GET "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_ORG_ID}&target=production&state=READY&limit=1" \
    --header "Authorization: Bearer ${VERCEL_TOKEN}"
  if is_2xx; then
    PREVIOUS_SHA=$(jq -r '.deployments[0].meta.sha // .deployments[0].meta.githubCommitSha // empty' <<<"$HTTP_BODY")
    log "Vercel: currently live sha '${PREVIOUS_SHA:-<unknown>}'"
  else
    log "Vercel: could not read current deployment (HTTP ${HTTP_STATUS}); continuing without previous sha"
  fi
fi

# --- 1-3. pull, build, deploy -----------------------------------------------
log "Vercel: pulling settings for project ${VERCEL_PROJECT_ID}"
vercel pull --yes --environment=production --token "$VERCEL_TOKEN" >&2

# Build-time variables must be real values. Vercel "Sensitive" variables cannot
# be pulled and come back as the literal "[SENSITIVE]", which Vite would bake in.
ENV_FILE=.vercel/.env.production.local
REQUIRED_VITE_VARS=${REQUIRED_VITE_VARS:-VITE_API_URL}
if [[ -f "$ENV_FILE" ]]; then
  problems=()
  for name in $REQUIRED_VITE_VARS; do
    value=$( { grep -E "^${name}=" "$ENV_FILE" || true; } | head -1 | cut -d= -f2- | tr -d '"')
    if [[ -z "$value" ]]; then
      problems+=("${name} is not set for the Production environment of this Vercel project")
    elif [[ "$value" == *SENSITIVE* ]]; then
      problems+=("${name} is marked Sensitive in Vercel, so the build cannot read it — re-add it with Sensitive unchecked (VITE_* values are public in the bundle anyway)")
    fi
  done
  if grep -q '\[SENSITIVE\]' "$ENV_FILE"; then
    sensitive_names=$( { grep '\[SENSITIVE\]' "$ENV_FILE" || true; } | cut -d= -f1 | tr '\n' ' ')
    log "Vercel: sensitive variables not available to the build: ${sensitive_names}"
  fi
  ((${#problems[@]} == 0)) || die "$(printf '%s; ' "${problems[@]}")"
else
  die "vercel pull did not produce ${ENV_FILE}; is VERCEL_PROJECT_ID correct?"
fi

log "Vercel: building ${SHA}"
vercel build --prod --yes --token "$VERCEL_TOKEN" >&2

log "Vercel: deploying prebuilt output"
DEPLOYMENT_URL=$(vercel deploy --prebuilt --prod --yes --token "$VERCEL_TOKEN" \
  --meta "sha=${SHA}" --meta "source=github-actions" \
  --meta "run=${GITHUB_RUN_ID:-local}")
[[ "$DEPLOYMENT_URL" =~ ^https:// ]] || die "vercel deploy did not return a deployment URL (got '${DEPLOYMENT_URL}')"

log "Vercel: deployment ${DEPLOYMENT_URL}"
emit_output deployment_url "$DEPLOYMENT_URL"
emit_output previous_sha "$PREVIOUS_SHA"
