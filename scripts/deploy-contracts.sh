#!/usr/bin/env bash
set -euo pipefail

# Deploys the contracts and writes the addresses into both .env files.
# Usage: scripts/deploy-contracts.sh [network]   (default: bscTestnet)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NETWORK="${1:-bscTestnet}"

echo "==> deploying contracts to $NETWORK"
OUTPUT="$(cd "$ROOT_DIR/code/blockchain" && npx hardhat run scripts/deploy.ts --network "$NETWORK")"
echo "$OUTPUT"

VAULT_ADDR="$(echo "$OUTPUT" | grep -oE 'STAKING_VAULT_ADDRESS=0x[a-fA-F0-9]{40}' | cut -d= -f2)"
REGISTRY_ADDR="$(echo "$OUTPUT" | grep -oE 'REFERRAL_REGISTRY_ADDRESS=0x[a-fA-F0-9]{40}' | cut -d= -f2)"
GAME_ADDR="$(echo "$OUTPUT" | grep -oE 'PREDICTION_GAME_ADDRESS=0x[a-fA-F0-9]{40}' | cut -d= -f2)"

if [[ -z "$VAULT_ADDR" || -z "$REGISTRY_ADDR" || -z "$GAME_ADDR" ]]; then
  echo "Could not parse deployed addresses from the deploy output above. Update the .env files manually."
  exit 1
fi

update_env() {
  local file="$1" key="$2" value="$3"
  if [[ ! -f "$file" ]]; then
    return
  fi
  if grep -q "^${key}=" "$file"; then
    sed -i.bak "s|^${key}=.*|${key}=\"${value}\"|" "$file" && rm -f "${file}.bak"
  else
    echo "${key}=\"${value}\"" >> "$file"
  fi
}

update_env "$ROOT_DIR/code/backend/.env" "STAKING_VAULT_ADDRESS" "$VAULT_ADDR"
update_env "$ROOT_DIR/code/backend/.env" "REFERRAL_REGISTRY_ADDRESS" "$REGISTRY_ADDR"
update_env "$ROOT_DIR/code/backend/.env" "PREDICTION_GAME_ADDRESS" "$GAME_ADDR"
update_env "$ROOT_DIR/frontend/.env" "VITE_STAKING_VAULT_ADDRESS" "$VAULT_ADDR"
update_env "$ROOT_DIR/frontend/.env" "VITE_REFERRAL_REGISTRY_ADDRESS" "$REGISTRY_ADDR"
update_env "$ROOT_DIR/frontend/.env" "VITE_PREDICTION_GAME_ADDRESS" "$GAME_ADDR"

echo
echo "Updated addresses:"
echo "  StakingVault:      $VAULT_ADDR"
echo "  ReferralRegistry:  $REGISTRY_ADDR"
echo "  PredictionGame:    $GAME_ADDR"
echo
echo "Set STAKING_VAULT_DEPLOY_BLOCK and PREDICTION_GAME_DEPLOY_BLOCK in"
echo "code/backend/.env by hand (from the deploy tx receipts)."
