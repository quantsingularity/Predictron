"""
Train the price-direction model from a CSV of historical candles and save
the artifact to ../../inference_api/artifacts/price_direction/.

Usage:
    python train.py --candles path/to/bnbusdt_5m.csv

Expects columns: timestamp, open, high, low, close, volume
(the standard export shape from most exchange/data-vendor APIs).
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd
from model import PriceDirectionModel

DEFAULT_ARTIFACT_DIR = (
    Path(__file__).resolve().parents[2]
    / "inference_api"
    / "artifacts"
    / "price_direction"
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--candles", required=True, help="CSV path with OHLCV candles")
    parser.add_argument(
        "--out", default=str(DEFAULT_ARTIFACT_DIR), help="Output artifact directory"
    )
    args = parser.parse_args()

    df = (
        pd.read_csv(args.candles, parse_dates=["timestamp"])
        .set_index("timestamp")
        .sort_index()
    )
    required = {"open", "high", "low", "close", "volume"}
    missing = required - set(df.columns)
    if missing:
        raise SystemExit(f"Input CSV missing columns: {missing}")

    model = PriceDirectionModel()
    metrics = model.train(df)
    print(
        f"accuracy={metrics.accuracy:.4f} log_loss={metrics.log_loss:.4f} "
        f"n_train={metrics.n_train} n_test={metrics.n_test}"
    )

    model.save(args.out)
    print(f"Saved model artifact to {args.out}")


if __name__ == "__main__":
    main()
