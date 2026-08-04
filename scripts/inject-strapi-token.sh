#!/usr/bin/env bash
#
# Waits for Strapi to print its bootstrap API tokens, then writes them into the
# root and per-service .env files. Strapi emits these only on first boot against
# an empty database, so a token present in the logs is always the current one and
# overwrites whatever the .env files hold.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=scripts/lib/env-file.sh
. "$ROOT_DIR/scripts/lib/env-file.sh"

ENV_FILE="${ENV_FILE:-.env}"
# Resolved by the Makefile via `docker compose ps -q strapi`, so this keeps
# working alongside another project that owns the container name "strapi".
STRAPI_CONTAINER="${STRAPI_CONTAINER:-}"
TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-180}"
POLL_INTERVAL=5

CRM_TOKEN_VAR=CRM_STRAPI_API_TOKEN
SHARED_TOKEN_VAR=JOURNEYS_DAL_COMPOSER_API_TOKEN

SHARED_TOKEN_TARGETS=(
  COMPOSER_STRAPI_API_TOKEN
  DAL_STRAPI_API_TOKEN
  JOURNEYS_STRAPI_API_TOKEN
  PLUGINS_STRAPI_API_TOKEN
)

TARGET_ENV_FILES=("$ENV_FILE")
if [ "$ENV_FILE" = ".env" ]; then
  TARGET_ENV_FILES+=(
    apps/composer/.env
    apps/journeys/.env
    apps/dal/.env
    apps/nowcrm/.env
    apps/plugins/.env
  )
fi

log()  { printf '%s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }

# Reduces the log to just the token assignments, stripping Strapi's ANSI colour.
# Returning only matches keeps a poll cheap: the log can reach 30MB.
strapi_token_lines() {
  docker logs "$STRAPI_CONTAINER" 2>&1 \
    | sed 's/\x1b\[[0-9;]*m//g' \
    | grep -Eo "($CRM_TOKEN_VAR|$SHARED_TOKEN_VAR)=[0-9a-fA-F]+" \
    || true
}

extract_token() {
  printf '%s\n' "$2" | grep -E "^$1=" | tail -1 | cut -d= -f2
}

set_token() {
  local var=$1 value=$2 file
  for file in "${TARGET_ENV_FILES[@]}"; do
    [ -f "$file" ] || continue
    grep -qE "^${var}=" "$file" || continue
    env_set "$var" "$value" "$file"
    log "    $var -> $file"
  done
}

if [ -z "$STRAPI_CONTAINER" ] || ! docker inspect "$STRAPI_CONTAINER" >/dev/null 2>&1; then
  warn "the strapi container is not running; skipping token injection"
  exit 0
fi

log "==> Waiting up to ${TIMEOUT_SECONDS}s for Strapi to emit its API tokens..."

deadline=$((SECONDS + TIMEOUT_SECONDS))
TOKEN_LINES=""
found=false
while true; do
  TOKEN_LINES="$(strapi_token_lines)"
  if [[ $TOKEN_LINES == *"$CRM_TOKEN_VAR="* && $TOKEN_LINES == *"$SHARED_TOKEN_VAR="* ]]; then
    found=true
    break
  fi
  [ "$SECONDS" -lt "$deadline" ] || break
  sleep "$POLL_INTERVAL"
done

if [ "$found" != true ]; then
  # Not fatal: after the first boot Strapi no longer prints the tokens.
  warn "no bootstrap tokens appeared in the logs within ${TIMEOUT_SECONDS}s."
  warn "If this is a first-time setup, check: docker logs $STRAPI_CONTAINER"
  exit 0
fi

CRM_TOKEN="$(extract_token "$CRM_TOKEN_VAR" "$TOKEN_LINES")"
SHARED_TOKEN="$(extract_token "$SHARED_TOKEN_VAR" "$TOKEN_LINES")"

if [ -n "$CRM_TOKEN" ]; then
  log "==> Injecting $CRM_TOKEN_VAR"
  set_token "$CRM_TOKEN_VAR" "$CRM_TOKEN"
else
  warn "$CRM_TOKEN_VAR not found in logs"
fi

if [ -n "$SHARED_TOKEN" ]; then
  log "==> Injecting the shared service token"
  for var in "${SHARED_TOKEN_TARGETS[@]}"; do
    set_token "$var" "$SHARED_TOKEN"
  done
else
  warn "$SHARED_TOKEN_VAR not found in logs"
fi

log "==> Token injection complete"
