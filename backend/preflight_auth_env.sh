#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./preflight_auth_env.sh .env.production.example --template
#   ./preflight_auth_env.sh /path/to/.env

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <env-file> [--template]" >&2
  exit 2
fi

ENV_FILE="$1"
MODE="runtime"
if [[ "${2:-}" == "--template" ]]; then
  MODE="template"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: env file not found: $ENV_FILE" >&2
  exit 1
fi

REQUIRED_KEYS=(
  PORT
  BACKEND_URL
  FRONTEND_URL
  JWT_SECRET
  DB_HOST
  DB_PORT
  DB_NAME
  DB_USER
  DB_PASSWORD
  SMTP_HOST
  SMTP_PORT
  EMAIL_USER
  EMAIL_PASS
  SMTP_FROM
)

get_value() {
  local key="$1"
  local line
  line=$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)
  if [[ -z "$line" ]]; then
    echo ""
    return
  fi
  echo "${line#*=}"
}

is_placeholder() {
  local value="$1"
  [[ -z "$value" ]] && return 0
  [[ "$value" =~ ^your[-_].* ]] && return 0
  [[ "$value" =~ change-in-production ]] && return 0
  [[ "$value" =~ example\.com ]] && return 0
  [[ "$value" == "password" ]] && return 0
  [[ "$value" == "your-app-password" ]] && return 0
  [[ "$value" == "your-app-specific-password" ]] && return 0
  return 1
}

missing=()
invalid=()

for key in "${REQUIRED_KEYS[@]}"; do
  value="$(get_value "$key")"
  if [[ -z "$value" ]]; then
    missing+=("$key")
    continue
  fi

  if [[ "$MODE" == "runtime" ]] && is_placeholder "$value"; then
    invalid+=("$key")
  fi
done

if [[ ${#missing[@]} -gt 0 ]]; then
  echo "ERROR: Missing required auth env keys in $ENV_FILE:" >&2
  for key in "${missing[@]}"; do
    echo "  - $key" >&2
  done
fi

if [[ ${#invalid[@]} -gt 0 ]]; then
  echo "ERROR: Placeholder values found for required auth env keys in $ENV_FILE:" >&2
  for key in "${invalid[@]}"; do
    echo "  - $key" >&2
  done
fi

if [[ ${#missing[@]} -gt 0 || ${#invalid[@]} -gt 0 ]]; then
  exit 1
fi

echo "OK: auth env preflight passed for $ENV_FILE (mode=$MODE)"
