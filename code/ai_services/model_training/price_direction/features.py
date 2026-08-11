"""Stationary, scale-independent feature engineering for OHLCV candles."""

from __future__ import annotations

import numpy as np
import pandas as pd


def compute_features(candles: pd.DataFrame) -> pd.DataFrame:
    """candles: OHLCV DataFrame indexed by time. Returns engineered features
    (leading rows may contain NaNs from rolling windows)."""
    df = candles.copy()

    df["log_return_1"] = np.log(df["close"] / df["close"].shift(1))
    df["log_return_3"] = np.log(df["close"] / df["close"].shift(3))
    df["log_return_6"] = np.log(df["close"] / df["close"].shift(6))

    df["rolling_vol_6"] = df["log_return_1"].rolling(6).std()
    df["rolling_vol_12"] = df["log_return_1"].rolling(12).std()

    df["hl_range"] = (df["high"] - df["low"]) / df["close"]
    df["body_ratio"] = (df["close"] - df["open"]).abs() / (
        df["high"] - df["low"]
    ).replace(0, np.nan)

    df["volume_z"] = (df["volume"] - df["volume"].rolling(20).mean()) / df[
        "volume"
    ].rolling(20).std()

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
