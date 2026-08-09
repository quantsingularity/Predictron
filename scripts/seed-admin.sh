#!/usr/bin/env bash
set -euo pipefail

# Promotes a user to the ADMIN role. There is deliberately no API route
# that does this (see code/backend/README.md) — granting admin access is a
# manual, auditable operational action, not a button anywhere in the app.
#
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

# -v/:'address' is psql's own parameter substitution — the address is
# bound as a value, never concatenated into the SQL string, so this stays
# injection-safe even though the input came straight from argv. Same
# principle as the Prisma-parameterized queries everywhere else in this
# project; a script is not an exception to that rule just because it's
# a script.
psql "$DATABASE_URL" -v address="$LOWER_ADDRESS" -c \
  "UPDATE \"User\" SET role = 'ADMIN' WHERE address = :'address';"

echo "Done. If no rows were affected, that address hasn't signed in yet — sign in once via the app, then re-run this."
