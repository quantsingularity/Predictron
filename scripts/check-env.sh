#!/usr/bin/env bash
set -euo pipefail

# The backend already fails fast at boot if its own env vars are invalid
# (code/backend/src/config/env.ts). This does the same check one level
# earlier, before a process even starts, across every package that needs
# a .env — so a missing file produces one clear message instead of a
# half-started dev.sh run.

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
