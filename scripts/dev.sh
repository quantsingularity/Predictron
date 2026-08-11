#!/usr/bin/env bash
set -euo pipefail

# Starts Postgres in Docker plus backend/frontend/AI natively, hot reload.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

"$ROOT_DIR/scripts/check-env.sh"

echo "==> starting Postgres"
docker compose -f "$ROOT_DIR/infrastructure/docker-compose.yml" up -d postgres

pids=()
cleanup() {
  echo
  echo "Shutting down..."
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT INT TERM

echo "==> starting backend (dev)"
(cd "$ROOT_DIR/code/backend" && npm run dev) &
pids+=($!)

echo "==> starting frontend (dev)"
(cd "$ROOT_DIR/frontend" && npm run dev) &
pids+=($!)

if [[ -d "$ROOT_DIR/code/ai_services/inference_api/.venv" ]]; then
  echo "==> starting AI inference service (dev)"
  (
    cd "$ROOT_DIR/code/ai_services/inference_api"
    # shellcheck disable=SC1091
    source .venv/bin/activate
    uvicorn main:app --reload --port 8000
  ) &
  pids+=($!)
else
  echo "(skipping AI inference service, .venv not found; run scripts/bootstrap.sh first if you want it)"
fi

wait
