# price_direction model

Gradient-boosted, isotonic-calibrated binary classifier predicting the
probability that the next candle closes above its open, used as an
advisory signal only (see `../../README.md` for the boundary this respects).

```
features.py   Stationary feature engineering (returns, volatility, momentum)
model.py      PriceDirectionModel: train / predict_proba_up / save / load
train.py      CLI entry point, reads a CSV, trains, saves the artifact
```

## Train

```bash
pip install -r requirements.txt
python train.py --candles path/to/bnbusdt_5m.csv
```

Saves to `../../inference_api/artifacts/price_direction/`, which the
FastAPI service loads on startup. No trained weights are checked into this
repo, bring your own historical candle data.

## Retraining cadence

Market regimes drift; a model trained once and left alone will quietly
become less calibrated over time. Retrain on a rolling window (e.g. trailing
6 months) on a schedule. A weekly cron calling `train.py` against freshly
exported candles is enough for a signal this coarse-grained.
