# Predictron Frontend

React + TypeScript + Vite. Wallet-first: connecting and signing in (SIWE)
happen from the header on every page. All fund-moving actions — stake,
unstake, claim reward, place a bet, claim a payout — are direct contract
calls signed by the connected wallet via `wagmi`. This app never asks for,
stores, or transmits a private key.

## Run locally

```bash
cp .env.example .env   # fill in backend URL + deployed contract addresses
npm install
npm run dev
```

## Design system

- **Color:** near-black graphite base (`#0B0F14`), not pure black. Bet
  direction uses `up`/`down` (teal-green / coral) — kept visually distinct
  from the `brand` violet used for primary CTAs, so a "Sign in" button is
  never confused with a "Bet Up" button.
- **Type:** Space Grotesk (display), Inter (UI text), IBM Plex Mono (all
  numeric/address/timer data) — the mono face is used specifically to give
  on-chain data a distinct, legible register from prose.
- **Signature element:** the `EpochTicker` strip at the top of every page —
  a real sequence of recent round outcomes, not a decorative pattern.
