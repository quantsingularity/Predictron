import sys
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException

from schemas import PriceDirectionRequest, PriceDirectionResponse

# The model class lives in ../model_training/price_direction — import it
# directly rather than duplicating the feature/model code here, so
# training and serving always agree on exactly one implementation.
MODEL_TRAINING_DIR = Path(__file__).resolve().parents[2] / "model_training" / "price_direction"
sys.path.insert(0, str(MODEL_TRAINING_DIR))
from model import PriceDirectionModel  # noqa: E402

ARTIFACT_DIR = Path(__file__).resolve().parents[1] / "artifacts" / "price_direction"

router = APIRouter(prefix="/predict", tags=["price-direction"])

_model: PriceDirectionModel | None = None
_load_attempted = False


def _get_model() -> PriceDirectionModel | None:
    global _model, _load_attempted
    if _model is None and not _load_attempted:
        _load_attempted = True
        if (ARTIFACT_DIR / "model.joblib").exists():
            _model = PriceDirectionModel.load(ARTIFACT_DIR)
    return _model


@router.post("/price-direction", response_model=PriceDirectionResponse)
def predict_price_direction(request: PriceDirectionRequest) -> PriceDirectionResponse:
    model = _get_model()
    if model is None:
        # No trained artifact yet. This is a normal, expected state for a
        # fresh deployment — the backend treats a non-200 here as "no
        # signal available" and simply hides the AI badge, never as an
        # error condition that affects round settlement.
        raise HTTPException(status_code=503, detail="Model artifact not available yet — run model_training/price_direction/train.py")

    df = pd.DataFrame([c.model_dump() for c in request.candles]).set_index("timestamp").sort_index()
    try:
        probability_up = model.predict_proba_up(df)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    from model import MODEL_VERSION

    return PriceDirectionResponse(probability_up=probability_up, model_version=MODEL_VERSION)
