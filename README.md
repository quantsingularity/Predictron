# Predictron

Predictron is a non custodial platform for on chain price prediction rounds and staking, with an advisory AI signal layer. Every fund moving action, staking, unstaking, claiming a reward, placing a bet, or claiming a payout, is a transaction signed by the user's own wallet.

<div align="center">
  <img src="docs/images/homepage.bmp" alt="AlphaForge HomePage" width="80%">
</div>

## Project structure

| Path                 | Description                                                                                                     |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `frontend/`          | React, TypeScript, Vite, wagmi/viem UI. Public homepage at `/`, authenticated dashboard at `/dashboard`.        |
| `code/backend/`      | Node, TypeScript, Express API and on chain event indexer. Read only with respect to funds.                      |
| `code/blockchain/`   | Solidity contracts: `StakingVault.sol`, `PredictionGame.sol`, `ReferralRegistry.sol`. Funds are held here.      |
| `code/ai_services/`  | Advisory only ML: `model_training/price_direction` (training code) and `inference_api` (FastAPI serving layer). |
| `scripts/`           | Operational scripts: bootstrap, env checks, contract deploy, admin promotion.                                   |
| `infrastructure/`    | Docker Compose, Dockerfiles, nginx config, and Kubernetes manifests.                                            |
| `.github/workflows/` | CI (lint, typecheck, build, contract compile) and Docker image publishing.                                      |

## Tech stack

| Layer          | Stack                                                              |
| -------------- | ------------------------------------------------------------------ |
| Frontend       | React, TypeScript, Vite, wagmi, viem, TanStack Query, Tailwind CSS |
| Backend        | Node.js, TypeScript, Express, Prisma, PostgreSQL, viem             |
| Blockchain     | Solidity, Hardhat, OpenZeppelin, Chainlink price feeds             |
| AI services    | Python, FastAPI, scikit-learn                                      |
| Infrastructure | Docker, Docker Compose, Kubernetes, nginx, GitHub Actions          |

## Core design principles

| Principle                     | Implementation                                                                                                                                                                                                                                                                         |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Non custodial funds           | Users stake, unstake, bet, and claim directly against the smart contracts with their own wallet.                                                                                                                                                                                       |
| Verified balances             | The backend indexer only credits activity that appears in contract event logs, never from client supplied input.                                                                                                                                                                       |
| Role based admin access       | Every admin route requires a valid session and a database confirmed `ADMIN` role, checked on every request.                                                                                                                                                                            |
| Parameterized data access     | All backend queries go through Prisma; no raw SQL string building.                                                                                                                                                                                                                     |
| Wallet based authentication   | Sign In With Ethereum (SIWE) with single use, expiring nonces, session delivered as an httpOnly cookie, never exposed to page JavaScript, so an XSS payload can't read it. No passwords, no private keys handled server side.                                                          |
| On chain referral rewards     | A user registers a referrer once via `ReferralRegistry.sol`; `PredictionGame.sol` then routes a capped share of its own house fee to that referrer automatically, paid on a separate pull withdrawal so a referrer's own behavior can never affect a referred user's ability to claim. |
| Advisory only AI              | The AI services layer cannot move funds or settle a round. It produces a probability and a risk score, nothing more.                                                                                                                                                                   |
| Least exposed network surface | In production, only the frontend is reachable from the internet. The backend and AI service are internal only.                                                                                                                                                                         |
| Reorg-aware indexing          | The event indexer stays a configurable number of blocks behind the chain head before indexing anything, so a shallow reorg can't cause an already-indexed event to silently vanish.                                                                                                    |

## Application flow

- Visit `/`, the public homepage, no wallet required to view.
- Connect a wallet via wagmi (MetaMask, WalletConnect, Coinbase Wallet).
- Sign in with a SIWE signature. This creates the account on first use, there's no separate sign up form.
- Land on `/dashboard`.
- From there: `/dashboard/prediction`, `/dashboard/staking`, `/dashboard/leaderboard`, `/dashboard/referrals`, and `/dashboard/admin` (role gated).

## Getting started

- Install dependencies: `scripts/bootstrap.sh`
- Configure backend env: `cp code/backend/.env.example code/backend/.env`
- Configure frontend env: `cp frontend/.env.example frontend/.env`
- Deploy contracts: `scripts/deploy-contracts.sh bscTestnet`
- Start local stack: `scripts/dev.sh`
- Promote an admin: `scripts/seed-admin.sh 0xYourAddress`

See `scripts/README.md` for what each script does.

### Local development, from a completely fresh clone

The steps above assume a testnet RPC and testnet funds. If you just want
everything running locally with no external accounts at all:

```bash
scripts/bootstrap.sh                              # installs every package's dependencies

# terminal 1, leave running
docker compose -f infrastructure/docker-compose.yml up -d postgres

# terminal 2, leave running
cd code/blockchain && npx hardhat node

# terminal 3
cd code/blockchain
npx hardhat run scripts/deploy-local-mocks.ts --network localhost
# copy the STAKING_TOKEN_ADDRESS=... PRICE_FEED_ADDRESS=... line it prints, then:
STAKING_TOKEN_ADDRESS=<printed> PRICE_FEED_ADDRESS=<printed> \
  ../../scripts/deploy-contracts.sh localhost
# this writes the deployed addresses into code/backend/.env and frontend/.env for you

cp code/backend/.env.example code/backend/.env    # deploy-contracts.sh edits this in place, so run the copy first
cp frontend/.env.example frontend/.env
openssl rand -hex 32                              # paste into code/backend/.env as SESSION_JWT_SECRET
```

```bash
cd code/backend && npx prisma migrate dev --name init
cd ../..
scripts/dev.sh                                     # backend + frontend + AI service, all with hot reload
```

### Package by package

| Package                          | Install                           | Run                                       |
| -------------------------------- | --------------------------------- | ----------------------------------------- |
| `code/blockchain`                | `npm install`                     | `npx hardhat compile && npx hardhat test` |
| `code/backend`                   | `npm install`                     | `npx prisma migrate dev && npm run dev`   |
| `code/ai_services/inference_api` | `pip install -r requirements.txt` | `uvicorn main:app --reload --port 8000`   |
| `frontend`                       | `npm install`                     | `npm run dev`                             |

### Docker and Kubernetes

For a container based setup, see `infrastructure/README.md`. It covers a Docker Compose stack with a `prod` profile, and a plain manifest Kubernetes deployment under `infrastructure/k8s/`.

## Documentation

- `frontend/README.md`: frontend design system and structure
- `code/backend/README.md`: backend architecture and admin promotion
- `code/ai_services/README.md`: AI services boundary and local usage
- `infrastructure/README.md`: Docker Compose setup and network topology
- `infrastructure/k8s/README.md`: Kubernetes manifests and apply order
- `scripts/README.md`: what each operational script does

## Tests

| Package                          | Command                                                           | Covers                                                                                                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `code/blockchain`                | `npx hardhat test` (`npx hardhat coverage` for a coverage report) | Both contracts' full round/staking lifecycle, the referral reward flow, and the specific edge cases called out in code comments (reward-reserve shortfall, fee-on-transfer tokens, round-start spam, a stale/invalid oracle answer). |
| `code/backend`                   | `npm test`                                                        | The cookie session middleware (missing/garbage/expired token, deleted user, DB-sourced role) and the leaderboard aggregation logic. Routes that need a live Postgres connection aren't covered here, see `code/backend/README.md`.   |
| `code/ai_services/inference_api` | `pip install -r requirements-dev.txt && pytest`                   | The risk-scoring heuristics, request validation, and the price-direction endpoint's behavior both with and without a trained model artifact present.                                                                                 |
| `frontend`                       | `npm run build`                                                   | No component test suite yet. `tsc -b` plus the production Vite build is the current safety net.                                                                                                                                      |
