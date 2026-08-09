# Predictron Backend

TypeScript + Express API. Read-only with respect to funds: it indexes
verified on-chain events into Postgres and serves them, plus handles
off-chain-only concerns (SIWE auth, referral display, support tickets,
admin analytics).

## What's deliberately _not_ here

- No wallet/private key anywhere in this package.
- No `/webhooks/...` route that credits a balance from client input.
- No admin route that approves a withdrawal — withdrawals are the user's own
  `unstake()`/`claim()` transaction against the contracts in `../contracts`.

## Run locally

```bash
cp .env.example .env   # fill in DATABASE_URL, RPC_URL, deployed contract addresses
npm install
npx prisma migrate dev --name init
npm run dev
```

## Promoting the first admin

There is intentionally no API route that grants the `ADMIN` role — that
would just be the same "unauthenticated endpoint that changes privilege"
bug in a new shape. Grant it directly against the database instead:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE address = '0xyouraddress';
```
