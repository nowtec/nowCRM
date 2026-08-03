#!/usr/bin/env bash
#
# Bootstraps the .env files for a local nowCRM stack:
#   1. creates the root .env and each service .env from its .env.sample
#   2. backfills keys added to a .env.sample since the .env was created
#   3. resolves the CUSTOMER_DOMAIN placeholder
#   4. generates any missing secret
#
# Safe to re-run: existing, non-empty values are never overwritten.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# shellcheck source=scripts/lib/env-file.sh
. "$ROOT_DIR/scripts/lib/env-file.sh"

ENV_FILE="${ENV_FILE:-.env}"

SERVICES=(apps/composer apps/journeys apps/dal apps/nowcrm apps/plugins)

# Secrets generated when missing or empty; see generate_secret for each.
SECRET_VARS=(
  STRAPI_DATABASE_NAME
  STRAPI_DATABASE_USERNAME
  STRAPI_DATABASE_PASSWORD
  STRAPI_ADMIN_JWT_SECRET
  STRAPI_API_TOKEN_SALT
  STRAPI_TRANSFER_TOKEN_SALT
  STRAPI_ENCRYPTION_KEY
  STRAPI_JWT_SECRET
  STRAPI_APP_KEYS
  STRAPI_TEST_ADMIN_PASSWORD
  STRAPI_AWS_REGION
  TEST_USER_USERNAME
  TEST_USER_PASSWORD
  CRM_TOTP_ENCRYPTION_KEY
  CRM_AUTH_SECRET
  DAL_BASIC_AUTH_USERNAME
  DAL_BASIC_AUTH_PASSWORD
)

# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

log()  { printf '%s\n' "$*"; }
warn() { printf 'warning: %s\n' "$*" >&2; }
die()  { printf 'error: %s\n' "$*" >&2; exit 1; }

rand() {
  local charset=$1 length=$2 out
  out=$(LC_ALL=C tr -dc "$charset" </dev/urandom | head -c "$length" || true)
  [ "${#out}" -eq "$length" ] || die "could not read $length random bytes from /dev/urandom"
  printf '%s' "$out"
}

generate_secret() {
  case $1 in
    STRAPI_DATABASE_NAME)        printf 'strapi_%s' "$(rand 'a-z0-9' 8)" ;;
    STRAPI_DATABASE_USERNAME)    printf 'strapi_%s' "$(rand 'a-z0-9' 8)" ;;
    STRAPI_DATABASE_PASSWORD)    rand 'A-Za-z0-9' 32 ;;
    STRAPI_ADMIN_JWT_SECRET)     rand 'A-Za-z0-9' 64 ;;
    STRAPI_API_TOKEN_SALT)       rand 'A-Za-z0-9' 32 ;;
    STRAPI_TRANSFER_TOKEN_SALT)  rand 'A-Za-z0-9' 32 ;;
    STRAPI_ENCRYPTION_KEY)       rand 'A-Za-z0-9' 64 ;;
    STRAPI_JWT_SECRET)           rand 'A-Za-z0-9' 64 ;;
    STRAPI_APP_KEYS)             printf '%s,%s' "$(rand 'A-Za-z0-9' 64)" "$(rand 'A-Za-z0-9' 64)" ;;
    STRAPI_TEST_ADMIN_PASSWORD)  printf '%sAa1!' "$(rand 'A-Za-z0-9' 16)" ;;
    STRAPI_AWS_REGION)           printf 'eu-central-1' ;;
    TEST_USER_USERNAME)          printf 'testuser_%s' "$(rand 'a-z0-9' 6)" ;;
    TEST_USER_PASSWORD)          printf '%sAa1!' "$(rand 'A-Za-z0-9' 16)" ;;
    CRM_TOTP_ENCRYPTION_KEY)     rand 'A-Za-z0-9' 64 ;;
    CRM_AUTH_SECRET)             rand 'A-Za-z0-9' 64 ;;
    DAL_BASIC_AUTH_USERNAME)     printf 'dal_%s' "$(rand 'a-z0-9' 6)" ;;
    DAL_BASIC_AUTH_PASSWORD)     rand 'A-Za-z0-9' 32 ;;
    *)                           die "no generator defined for $1" ;;
  esac
}

# sync_missing_keys <sample> <target> -- appends keys present in <sample> but
# missing from <target>, so an .env from an earlier release does not stay
# silently incomplete. Existing values are never modified.
sync_missing_keys() {
  local sample=$1 target=$2 key line added=0
  [ -f "$sample" ] || return 0
  env_touch "$target"
  while IFS= read -r line; do
    case $line in
      [A-Za-z_]*=*) key=${line%%=*} ;;
      *) continue ;;
    esac
    grep -qE "^${key}=" "$target" && continue
    if [ -s "$target" ] && [ -n "$(tail -c1 "$target")" ]; then printf '\n' >>"$target"; fi
    printf '%s\n' "$line" >>"$target"
    log "    added missing $key"
    added=$((added + 1))
  done <"$sample"
  [ "$added" -gt 0 ] || log "    no new keys in $sample"
}

# substitute_domain <domain> <file> -- expands the CUSTOMER_DOMAIN placeholder in
# values without touching the CUSTOMER_DOMAIN= line. Idempotent.
substitute_domain() {
  local domain=$1 file=$2 tmp
  [ -f "$file" ] || return 0
  tmp=$(env_tmp "$file")
  ENV_DOMAIN="$domain" awk '
    BEGIN { d = ENVIRON["ENV_DOMAIN"] }
    /^CUSTOMER_DOMAIN=/ { print; next }
    { gsub(/CUSTOMER_DOMAIN/, d); print }
  ' "$file" >"$tmp"
  chmod "$ENV_FILE_MODE" "$tmp"
  mv -- "$tmp" "$file"
}

# --------------------------------------------------------------------------
# 1. Root .env
# --------------------------------------------------------------------------

log "==> Preparing $ENV_FILE"
if [ -f "$ENV_FILE" ]; then
  log "    $ENV_FILE already exists"
elif [ -f .env.sample ]; then
  cp .env.sample "$ENV_FILE"
  log "    created $ENV_FILE from .env.sample"
else
  warn ".env.sample not found; created an empty $ENV_FILE"
fi
env_touch "$ENV_FILE"

log "==> Backfilling keys added to .env.sample since $ENV_FILE was created"
sync_missing_keys .env.sample "$ENV_FILE"

# --------------------------------------------------------------------------
# 2. CUSTOMER_DOMAIN
# --------------------------------------------------------------------------

CUSTOMER_DOMAIN_VALUE="$(env_get CUSTOMER_DOMAIN "$ENV_FILE")"

if [ -n "$CUSTOMER_DOMAIN_VALUE" ]; then
  log "==> CUSTOMER_DOMAIN already set to $CUSTOMER_DOMAIN_VALUE"
else
  if [ -n "${CUSTOMER_DOMAIN:-}" ]; then
    CUSTOMER_DOMAIN_VALUE="$CUSTOMER_DOMAIN"
    log "==> Using CUSTOMER_DOMAIN from the environment: $CUSTOMER_DOMAIN_VALUE"
  elif [ -t 0 ]; then
    printf 'Enter CUSTOMER_DOMAIN (e.g. nowtec.solutions): '
    read -r CUSTOMER_DOMAIN_VALUE
    [ -n "$CUSTOMER_DOMAIN_VALUE" ] || die "CUSTOMER_DOMAIN cannot be empty."
  else
    die "CUSTOMER_DOMAIN is not set and no terminal is available to prompt.
       Re-run with: CUSTOMER_DOMAIN=example.com make init-env"
  fi

  env_set CUSTOMER_DOMAIN "$CUSTOMER_DOMAIN_VALUE" "$ENV_FILE"
  log "==> CUSTOMER_DOMAIN set to $CUSTOMER_DOMAIN_VALUE"
fi

substitute_domain "$CUSTOMER_DOMAIN_VALUE" "$ENV_FILE"

# --------------------------------------------------------------------------
# 3. Per-service .env files
# --------------------------------------------------------------------------

log "==> Preparing service .env files"
for dir in "${SERVICES[@]}"; do
  [ -d "$dir" ] || continue
  if [ ! -f "$dir/.env.sample" ]; then
    warn "no .env.sample in $dir, skipping"
    continue
  fi
  if [ -f "$dir/.env" ]; then
    log "    $dir/.env already exists"
  else
    cp "$dir/.env.sample" "$dir/.env"
    log "    created $dir/.env"
  fi
  env_touch "$dir/.env"
  sync_missing_keys "$dir/.env.sample" "$dir/.env"
  substitute_domain "$CUSTOMER_DOMAIN_VALUE" "$dir/.env"
done

# --------------------------------------------------------------------------
# 4. Secrets
# --------------------------------------------------------------------------

log "==> Generating missing secrets in $ENV_FILE"
for var in "${SECRET_VARS[@]}"; do
  if env_is_empty "$var" "$ENV_FILE"; then
    value="$(generate_secret "$var")"
    [ -n "$value" ] || die "generated an empty value for $var"
    env_set "$var" "$value" "$ENV_FILE"
    log "    set $var"
  else
    log "    $var already set, skipping"
  fi
done

# --------------------------------------------------------------------------
# 5. Mirror shared values into the CRM service env
# --------------------------------------------------------------------------

NOWCRM_ENV="apps/nowcrm/.env"
if [ -f "$NOWCRM_ENV" ]; then
  log "==> Syncing CRM secrets into $NOWCRM_ENV"
  env_set CRM_TOTP_ENCRYPTION_KEY "$(env_get CRM_TOTP_ENCRYPTION_KEY "$ENV_FILE")" "$NOWCRM_ENV"
  # The CRM reads NextAuth's secret as AUTH_SECRET.
  env_set AUTH_SECRET "$(env_get CRM_AUTH_SECRET "$ENV_FILE")" "$NOWCRM_ENV"
else
  warn "$NOWCRM_ENV not found, skipping CRM secret sync"
fi

log "==> Environment setup complete"
