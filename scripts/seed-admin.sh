#!/usr/bin/env bash
set -euo pipefail

# Promotes a user to ADMIN. No API route does this, see code/backend/README.md.
# Usage: scripts/seed-admin.sh 0xYourAddress

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ADDRESS="${1:-}"

if [[ -z "$ADDRESS" ]]; then
  echo "Usage: scripts/seed-admin.sh 0xYourAddress"
  exit 1
fi

if [[ ! "$ADDRESS" =~ ^0x[a-fA-F0-9]{40}$ ]]; then
  echo "Error: '$ADDRESS' doesn't look like a valid EVM address."
  exit 1
fi

ENV_FILE="$ROOT_DIR/code/backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found. Copy code/backend/.env.example first."
  exit 1
fi

DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"')"
if [[ -z "$DATABASE_URL" ]]; then
  echo "Error: DATABASE_URL not set in $ENV_FILE"
  exit 1
fi

LOWER_ADDRESS="$(echo "$ADDRESS" | tr '[:upper:]' '[:lower:]')"

# -v binds the address as a parameter, never string-concatenated.
psql "$DATABASE_URL" -v address="$LOWER_ADDRESS" -c \
  "UPDATE \"User\" SET role = 'ADMIN' WHERE address = :'address';"

echo "Done. If no rows were affected, that address hasn't signed in yet. Sign in once via the app, then re-run this."
