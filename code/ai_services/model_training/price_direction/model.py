"""
A deliberately simple, well-calibrated model over a fancy one.

Gradient-boosted trees on hand-engineered features rather than a deep
sequence model: at 5-minute-candle horizons the signal-to-noise ratio is
low, the dataset is modest, and — since this output is only ever shown as
an advisory probability next to the real settlement price — a model whose
probabilities are actually well-calibrated matters more than a marginal
accuracy gain from a heavier architecture.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from features import FEATURE_COLUMNS, compute_features
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import TimeSeriesSplit

MODEL_VERSION = "price_direction_v1"


@dataclass
class TrainMetrics:
    accuracy: float
    log_loss: float
    n_train: int
    n_test: int


class PriceDirectionModel:
    """Predicts P(next candle closes higher than it opened)."""

    def __init__(self) -> None:
        self._pipeline: CalibratedClassifierCV | None = None

    def train(self, candles: pd.DataFrame) -> TrainMetrics:
        features = compute_features(candles)
        target = (candles["close"].shift(-1) > candles["close"]).astype(int)

        data = features.join(target.rename("target")).dropna()
        X = data[FEATURE_COLUMNS]
        y = data["target"]

        split = TimeSeriesSplit(n_splits=5)
        train_idx, test_idx = list(split.split(X))[-1]
        X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
        y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

        base = GradientBoostingClassifier(
            n_estimators=150,
            max_depth=3,
            learning_rate=0.05,
            subsample=0.8,
            random_state=42,
        )
        # Calibrate so predict_proba outputs are trustworthy probabilities,
        # not just a monotonic ranking score.
        calibrated = CalibratedClassifierCV(base, method="isotonic", cv=3)
        calibrated.fit(X_train, y_train)
        self._pipeline = calibrated

        from sklearn.metrics import accuracy_score, log_loss

        proba = calibrated.predict_proba(X_test)[:, 1]
        preds = (proba >= 0.5).astype(int)

        return TrainMetrics(
            accuracy=float(accuracy_score(y_test, preds)),
            log_loss=float(log_loss(y_test, proba)),
            n_train=len(X_train),
            n_test=len(X_test),
        )

    def predict_proba_up(self, candles: pd.DataFrame) -> float:
        if self._pipeline is None:
            raise RuntimeError("Model not trained/loaded")
        features = compute_features(candles).dropna()
        if features.empty:
            raise ValueError("Not enough candles to compute features (need >= 20)")
        latest = features.iloc[[-1]][FEATURE_COLUMNS]
        proba = self._pipeline.predict_proba(latest)[0, 1]
        return float(np.clip(proba, 0.0, 1.0))

    def save(self, path: str | Path) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(self._pipeline, path / "model.joblib")
        (path / "metadata.json").write_text(json.dumps({"version": MODEL_VERSION}))

    @classmethod
    def load(cls, path: str | Path) -> "PriceDirectionModel":
        path = Path(path)
        instance = cls()
        instance._pipeline = joblib.load(path / "model.joblib")
        return instance
