#!/usr/bin/env bash
set -euo pipefail

# Installs dependencies for every package in the monorepo.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> frontend"
(cd "$ROOT_DIR/frontend" && npm install)

echo "==> code/backend"
(cd "$ROOT_DIR/code/backend" && npm install)

echo "==> code/blockchain"
(cd "$ROOT_DIR/code/blockchain" && npm install)

echo "==> code/ai_services/inference_api"
(
  cd "$ROOT_DIR/code/ai_services/inference_api"
  python3 -m venv .venv
  # shellcheck disable=SC1091
  source .venv/bin/activate
  pip install --quiet -r requirements.txt
)

echo
echo "All dependencies installed. Next: scripts/check-env.sh"
