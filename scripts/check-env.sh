#!/usr/bin/env bash
set -euo pipefail

# Checks every package's .env exists before dev.sh half-starts.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
missing=0

require_env() {
  local dir="$1"
  if [[ ! -f "$dir/.env" ]]; then
    echo "Missing: $dir/.env  (cp $dir/.env.example $dir/.env, then fill it in)"
    missing=1
  fi
}

require_env "$ROOT_DIR/code/backend"
require_env "$ROOT_DIR/frontend"

if [[ $missing -eq 1 ]]; then
  echo
  echo "Fix the above, then re-run this script."
  exit 1
fi

echo "All required .env files are present."
