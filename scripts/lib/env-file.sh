#!/usr/bin/env bash
#
# Shared helpers for reading and writing .env files. Meant to be sourced.

ENV_FILE_MODE=600

env_tmp() {
  local dir
  dir=$(dirname -- "$1")
  mktemp -- "$dir/.env.tmp.XXXXXX"
}

env_touch() {
  local file=$1
  [ -e "$file" ] || : >"$file"
  chmod "$ENV_FILE_MODE" "$file"
}

# env_get <key> <file> -- value with quotes, escapes and inline comment stripped.
# Later assignments win, matching how docker compose reads .env.
env_get() {
  local key=$1 file=$2 line value
  [ -f "$file" ] || return 0
  line=$(grep -E "^${key}=" "$file" 2>/dev/null | tail -1)
  [ -n "$line" ] || return 0

  value=${line#*=}
  case $value in
    '"'*)
      value=${value#'"'}
      value=${value%'"'*}
      value=${value//\\\"/\"}
      value=${value//\\\\/\\}
      ;;
    "'"*)
      value=${value#"'"}
      value=${value%"'"*}
      ;;
    *)
      value=${value%%[[:space:]]#*}
      value=${value#"${value%%[![:space:]]*}"}
      value=${value%"${value##*[![:space:]]}"}
      ;;
  esac
  printf '%s' "$value"
}

# env_set <key> <value> <file> -- rewrites <key> in place or appends it, dropping
# duplicates. The value travels via the environment so awk never reinterprets
# metacharacters in generated passwords.
env_set() {
  local key=$1 value=$2 file=$3 tmp
  env_touch "$file"

  value=${value//\\/\\\\}
  value=${value//\"/\\\"}

  tmp=$(env_tmp "$file") || return 1
  if grep -qE "^${key}=" "$file"; then
    ENV_SET_VALUE="$value" awk -v k="$key" '
      BEGIN { v = ENVIRON["ENV_SET_VALUE"]; written = 0 }
      index($0, k "=") == 1 {
        if (!written) { print k "=\"" v "\""; written = 1 }
        next
      }
      { print }
    ' "$file" >"$tmp"
  else
    cat "$file" >"$tmp"
    if [ -s "$tmp" ] && [ -n "$(tail -c1 "$tmp")" ]; then printf '\n' >>"$tmp"; fi
    printf '%s="%s"\n' "$key" "$value" >>"$tmp"
  fi

  chmod "$ENV_FILE_MODE" "$tmp"
  mv -- "$tmp" "$file"
}

# env_is_empty <key> <file> -- true when absent or set to an empty value.
env_is_empty() {
  local key=$1 file=$2
  [ -f "$file" ] || return 0
  grep -qE "^${key}=" "$file" || return 0
  [ -z "$(env_get "$key" "$file")" ]
}
