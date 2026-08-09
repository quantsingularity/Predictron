# Predictron AI / ML

Two things live here:

```
model_training/price_direction/   Training code + a scikit-learn model for a short-horizon
                                   "which way is price likely to move" signal
inference_api/                    FastAPI service that serves that model (and a simple
                                   withdrawal-pattern risk score) over HTTP
```

## The one rule everything here follows

**Nothing in this directory can move funds, settle a prediction round, or
approve a withdrawal.** Every output is advisory only:

- The price-direction model produces a _probability_, shown in the frontend
  as a labeled "AI signal (advisory)" badge next to the real, authoritative
  Chainlink-derived lock/close price from `PredictionGame.sol`. A user's bet
  is settled by the contract's oracle read, never by this model. If this
  service is wrong, slow, or fully offline, round settlement is unaffected.
- The risk-scoring endpoint gives the admin dashboard a number to help a
  human prioritize which withdrawal-pattern activity to look at. It cannot
  block, delay, or flag a transaction on-chain — there's no mechanism for it
  to do so, by design. Withdrawals go through `StakingVault.unstake()`
  regardless of what this service says.

This mirrors the same lesson the rest of the rebuild is built around: the
old platform's worst bugs came from letting an off-chain service (a
webhook, an admin panel) become a trusted source of truth for money. Adding
an ML service is genuinely useful — but only if it's kept on the read/advise
side of that line permanently, not "for now."

## Running locally

```bash
cd inference_api
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend calls this over plain HTTP on the internal network (see
`code/backend/src/services/aiSignals.service.ts`) and treats a failed or slow
response as "no signal available" — never as an error that blocks anything
else in the app.
