# Scripts

Operational glue for the monorepo. Typical order for a fresh setup:

```bash
scripts/bootstrap.sh          # npm/pip install across every package
cp code/backend/.env.example code/backend/.env      # then fill in
cp frontend/.env.example frontend/.env              # then fill in
scripts/check-env.sh          # confirms the two files above exist
scripts/deploy-contracts.sh bscTestnet   # deploys contracts, writes addresses into both .env files
scripts/dev.sh                # Postgres in Docker + backend/frontend/AI service with hot reload
scripts/seed-admin.sh 0xYourAddress      # after you've signed in once, grants yourself ADMIN
```

| Script                          | What it does                                                                                                                                         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bootstrap.sh`                  | Installs dependencies for `frontend/`, `code/backend/`, `code/blockchain/`, and creates a venv + installs deps for `code/ai_services/inference_api/` |
| `check-env.sh`                  | Fails fast with a clear message if a required `.env` is missing, instead of letting `dev.sh` half-start                                              |
| `dev.sh`                        | Starts Postgres via `infrastructure/docker-compose.yml`, then backend/frontend/AI service natively (hot reload)                                      |
| `deploy-contracts.sh [network]` | Runs the Hardhat deploy script and writes the resulting contract addresses into both `.env` files. No manual copy-paste                              |
| `seed-admin.sh <address>`       | Grants the `ADMIN` role to an address that has already signed in once. There's no API route for this on purpose, see `code/backend/README.md`        |
