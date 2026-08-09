"""
Feature engineering for the short-horizon price-direction model.

Takes a window of recent OHLCV candles and derives a small set of
stationary, scale-independent features — raw price levels are deliberately
excluded so the model generalizes across price regimes instead of
memorizing "BNB was around $600 in this training set."
"""
from __future__ import annotations

import numpy as np
import pandas as pd


def compute_features(candles: pd.DataFrame) -> pd.DataFrame:
    """
    candles: DataFrame with columns [open, high, low, close, volume],
    indexed by time ascending, at a fixed interval matching the prediction
    round length (e.g. 5-minute candles for 5-minute rounds).

    Returns a DataFrame of engineered features, one row per input row
    (rows near the start will contain NaNs from rolling windows and should
    be dropped by the caller before training/inference).
    """
    df = candles.copy()

    df["log_return_1"] = np.log(df["close"] / df["close"].shift(1))
    df["log_return_3"] = np.log(df["close"] / df["close"].shift(3))
    df["log_return_6"] = np.log(df["close"] / df["close"].shift(6))

    df["rolling_vol_6"] = df["log_return_1"].rolling(6).std()
    df["rolling_vol_12"] = df["log_return_1"].rolling(12).std()

    df["hl_range"] = (df["high"] - df["low"]) / df["close"]
    df["body_ratio"] = (df["close"] - df["open"]).abs() / (df["high"] - df["low"]).replace(0, np.nan)

    df["volume_z"] = (df["volume"] - df["volume"].rolling(20).mean()) / df["volume"].rolling(20).std()

    # Simple momentum: fraction of the last 10 candles that closed green
    df["up_candle"] = (df["close"] > df["open"]).astype(int)
    df["momentum_10"] = df["up_candle"].rolling(10).mean()

    feature_cols = [
        "log_return_1",
        "log_return_3",
        "log_return_6",
        "rolling_vol_6",
        "rolling_vol_12",
        "hl_range",
        "body_ratio",
        "volume_z",
        "momentum_10",
    ]
    return df[feature_cols]


FEATURE_COLUMNS = [
    "log_return_1",
    "log_return_3",
    "log_return_6",
    "rolling_vol_6",
    "rolling_vol_12",
    "hl_range",
    "body_ratio",
    "volume_z",
    "momentum_10",
]
