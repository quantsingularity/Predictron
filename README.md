# Predictron

![CI Status](https://img.shields.io/github/actions/workflow/status/abrar2030/Predictron/cicd.yml?branch=main&label=CI&logo=github)

## Non-Custodial On-Chain Prediction and Staking Platform

Predictron is a non-custodial platform for on-chain price prediction rounds and staking, backed by an advisory-only AI signal layer. Every fund-moving action, staking, unstaking, claiming a reward, placing a bet, or claiming a payout, is a transaction signed by the user's own wallet. The backend never touches a private key, and the AI layer never touches a fund; those two boundaries shape most of the design.

<div align="center">
  <img src="docs/images/homepage.bmp" alt="Predictron HomePage" width="100%">
</div>

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Feature Status](#feature-status)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation and Setup](#installation-and-setup)
- [Running the Stack](#running-the-stack)
- [API Surface](#api-surface)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview

Predictron demonstrates a non-custodial staking and prediction workflow across a real, runnable codebase, with every claim in this document verified against the source. Wallet-based Sign-In with Ethereum (SIWE) authentication, Prisma-only database access with no raw SQL anywhere in the backend, reorg-aware on-chain event indexing, and a hard boundary between the fund-moving smart contracts and the advisory-only AI service are all genuinely implemented, not aspirational.

## Project Structure

```
Predictron/
├── code/
│   ├── backend/                # Node.js/TypeScript (Express) API
│   │   ├── src/routes/         # auth, staking, prediction, referrals, tickets,
│   │   │                       # admin, ai (all under /api)
│   │   ├── src/services/       # siwe.service (SIWE nonce issuance and verification)
│   │   ├── src/middleware/     # auth (session + role check), rate limiting
│   │   ├── src/jobs/           # chainIndexer.job (reorg-aware event indexing)
│   │   ├── prisma/             # Prisma schema and migrations (PostgreSQL)
│   │   └── test/               # Backend test suite
│   ├── blockchain/             # Hardhat project
│   │   ├── contracts/          # PredictionGame, StakingVault, ReferralRegistry
│   │   └── test/               # Hardhat test suite
│   └── ai_services/
│       ├── inference_api/      # FastAPI serving layer: price direction (optional
│       │                       # trained model, degrades gracefully if absent) and
│       │                       # risk signals (explainable rule-based heuristics)
│       └── model_training/     # Training code for the price-direction model
├── frontend/                   # React, TypeScript, Vite, wagmi/viem UI
├── infrastructure/             # Docker Compose (with a prod profile), Dockerfiles,
│                               # nginx config, and plain-manifest Kubernetes
├── scripts/                    # bootstrap, env checks, contract deploy, admin
└── README.md
```

## Feature Status

### Application tier (wired and tested)

| Component                         | Details                                                                                                                                                                                                                                                                           |
| :-------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wallet-based auth**             | Sign-In with Ethereum (SIWE) with single-use, expiring nonces stored in Postgres. The session is set as an httpOnly cookie, never exposed to page JavaScript. No passwords, no server-side private keys.                                                                          |
| **Role-based admin access**       | Every admin route checks `req.user.role === "ADMIN"` on each request via a dedicated middleware, backed by the database, not a client-supplied claim.                                                                                                                             |
| **Non-custodial funds**           | Staking, unstaking, betting, and claiming all happen as transactions the user signs directly against the smart contracts; the backend never custodies funds.                                                                                                                      |
| **Verified balances**             | The chain indexer only credits activity that appears in real contract event logs, and stays a configurable number of blocks (`INDEXER_CONFIRMATION_BLOCKS`) behind the chain head before indexing, so a shallow reorg can't cause an already-indexed event to silently disappear. |
| **Parameterized data access**     | Every database query goes through Prisma; there is no raw SQL (`$queryRaw` or `$executeRaw`) anywhere in the backend.                                                                                                                                                             |
| **On-chain referral rewards**     | A user registers a referrer once via `ReferralRegistry.sol`; `PredictionGame.sol` then routes a capped share of its own house fee to that referrer automatically, paid via a separate pull withdrawal.                                                                            |
| **Advisory-only AI**              | The AI service can only return a probability and a risk score; it has no access to any wallet, contract, or fund-moving capability. Risk signals are explainable rule-based heuristics, not a black-box model.                                                                    |
| **Least exposed network surface** | In both the Docker Compose and Kubernetes setups, only the frontend is reachable from outside the network; the backend and AI service are internal-only.                                                                                                                          |
| **Web frontend**                  | React, TypeScript, and Vite app using wagmi and viem for wallet connections (MetaMask, WalletConnect, Coinbase Wallet), TanStack Query, and Tailwind CSS.                                                                                                                         |

## Technology Stack

| Area           | Technology                                                                                                              |
| :------------- | :---------------------------------------------------------------------------------------------------------------------- |
| Blockchain     | Solidity, Hardhat, OpenZeppelin, Chainlink price feeds                                                                  |
| Backend API    | Node.js, TypeScript, Express, Prisma, viem                                                                              |
| Auth           | SIWE (Sign-In with Ethereum), httpOnly session cookies                                                                  |
| Data layer     | PostgreSQL (via Prisma, no raw SQL anywhere)                                                                            |
| AI service     | Python, FastAPI, scikit-learn (optional trained model, with a rule-based fallback for risk signals)                     |
| Frontend       | React, TypeScript, Vite, wagmi, viem, TanStack Query, Tailwind CSS                                                      |
| Infrastructure | Docker, Docker Compose, Kubernetes, nginx                                                                               |
| CI/CD          | GitHub Actions                                                                                                          |
| Testing        | Hardhat (contracts), a Node.js test runner (backend), pytest (AI service); the frontend has no component test suite yet |

## Architecture

```
Client (only service reachable from outside the network)
  └── frontend (React, wagmi/viem)     ── HTTP ──┐
                                                  ▼
Backend (Express, /api, internal only)
  ├── Routes    auth, staking, prediction, referrals, tickets, admin, ai
  ├── Services   siwe.service (SIWE nonce issuance and verification)
  ├── Middleware  session auth, role check, per-route rate limiting
  ├── Jobs         chainIndexer.job (reorg-aware event indexing)
  └── Data layer     PostgreSQL via Prisma (no raw SQL)

Blockchain (Hardhat / Solidity)
  PredictionGame · StakingVault · ReferralRegistry
  (Chainlink price feeds for round settlement)

AI service (internal only, advisory only, no fund access)
  price_direction (optional trained model, graceful fallback if absent)
  risk_signals (explainable rule-based heuristics)
```

See `code/backend/README.md`, `code/ai_services/README.md`, and `infrastructure/README.md` for detail.

## Installation and Setup

Prerequisites: Node.js 20+, Python 3.12, and Docker.

Quick path, assuming a testnet RPC and testnet funds:

| Step                   | Command                                          |
| :--------------------- | :----------------------------------------------- |
| Install dependencies   | `scripts/bootstrap.sh`                           |
| Configure backend env  | `cp code/backend/.env.example code/backend/.env` |
| Configure frontend env | `cp frontend/.env.example frontend/.env`         |
| Deploy contracts       | `scripts/deploy-contracts.sh bscTestnet`         |
| Start local stack      | `scripts/dev.sh`                                 |
| Promote an admin       | `scripts/seed-admin.sh 0xYourAddress`            |

See `scripts/README.md` for what each script does.

### Local development from a completely fresh clone

If you want everything running locally with no external accounts:

```bash
scripts/bootstrap.sh  # installs every package's dependencies

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

cp code/backend/.env.example code/backend/.env  # deploy-contracts.sh edits this in place,
                                                 # so run the copy first
cp frontend/.env.example frontend/.env
openssl rand -hex 32  # paste into code/backend/.env as SESSION_JWT_SECRET
```

```bash
cd code/backend && npx prisma migrate dev --name init
cd ../..
scripts/dev.sh  # backend, frontend, and AI service, all with hot reload
```

## Running the Stack

| Package                          | Install                           | Run                                       |
| :------------------------------- | :-------------------------------- | :---------------------------------------- |
| `code/blockchain`                | `npm install`                     | `npx hardhat compile && npx hardhat test` |
| `code/backend`                   | `npm install`                     | `npx prisma migrate dev && npm run dev`   |
| `code/ai_services/inference_api` | `pip install -r requirements.txt` | `uvicorn main:app --reload --port 8000`   |
| `frontend`                       | `npm install`                     | `npm run dev`                             |

For a container-based setup, see `infrastructure/README.md`. It covers a Docker Compose stack with a `prod` profile, and a plain-manifest Kubernetes deployment under `infrastructure/k8s/`. In both setups, only the frontend is reachable from outside the network.

## API Surface

All routes are mounted under `/api` with per-route rate limiting.

| Group      | Prefix            | Backing route file                                        |
| :--------- | :---------------- | :-------------------------------------------------------- |
| Auth       | `/api/auth`       | `auth.routes.ts` (SIWE nonce, verify, session)            |
| Staking    | `/api/staking`    | `staking.routes.ts`                                       |
| Prediction | `/api/prediction` | `prediction.routes.ts`                                    |
| Referrals  | `/api/referrals`  | `referral.routes.ts`                                      |
| Tickets    | `/api/tickets`    | `ticket.routes.ts`                                        |
| Admin      | `/api/admin`      | `admin.routes.ts` (role-gated)                            |
| AI         | `/api/ai`         | `ai.routes.ts` (proxies to the FastAPI inference service) |

Full request and response shapes are documented inline in each route file; there is no separate API reference document in this repository yet.

## Testing

```bash
# Smart contracts (from code/blockchain)
npx hardhat test
npx hardhat coverage        # for a coverage report

# Backend (from code/backend)
npm test

# AI service (from code/ai_services/inference_api)
pip install -r requirements-dev.txt && pytest

# Frontend (from frontend)
npm run build                # tsc -b plus a production Vite build; there is
                              # no component test suite yet
```

| Package                          | Covers                                                                                                                                                                                                                                    |
| :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `code/blockchain`                | Both contracts' full round and staking lifecycle, the referral reward flow, and specific edge cases called out in code comments (reward reserve shortfall, fee-on-transfer tokens, round-start spam, a stale or invalid oracle answer).   |
| `code/backend`                   | The cookie session middleware (missing, garbage, or expired token, deleted user, database-sourced role) and leaderboard aggregation logic. Routes that need a live Postgres connection aren't covered here; see `code/backend/README.md`. |
| `code/ai_services/inference_api` | Risk-scoring heuristics, request validation, and the price-direction endpoint's behavior both with and without a trained model artifact present.                                                                                          |

The CI backend job runs lint and build only, not `npm test`; the AI-inference CI job runs a compile check (`python -m compileall`), not the pytest suite. Both test suites exist and run locally, but neither is currently exercised in CI.

## CI/CD Pipeline

GitHub Actions (`.github/workflows/cicd.yml`) runs four independent jobs on push to `main` and on pull requests, with no shared setup job between them:

| Job          | What it does                                                                                                                                   |
| :----------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| frontend     | Installs dependencies, lints, and builds the frontend.                                                                                         |
| backend      | Installs dependencies, generates the Prisma client against a placeholder database URL, lints, and builds. Does not run the backend test suite. |
| blockchain   | Compiles the contracts with Hardhat and runs the full Hardhat test suite.                                                                      |
| ai-inference | Installs Python dependencies and runs a compile check (`python -m compileall`); does not run the pytest suite.                                 |

## Documentation

There is no `docs/*.md` set in this repository; documentation lives alongside each package instead.

| File                           | Covers                                    |
| :----------------------------- | :---------------------------------------- |
| `frontend/README.md`           | Frontend design system and structure      |
| `code/backend/README.md`       | Backend architecture and admin promotion  |
| `code/ai_services/README.md`   | AI service boundary and local usage       |
| `infrastructure/README.md`     | Docker Compose setup and network topology |
| `infrastructure/k8s/README.md` | Kubernetes manifests and apply order      |
| `scripts/README.md`            | What each operational script does         |

## Contributing

Open a pull request. See the package-level READMEs above for architecture context before making changes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
