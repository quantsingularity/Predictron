import routers.price_direction as price_direction_module
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def make_candles(n=25):
    candles = []
    price = 100.0
    for i in range(n):
        price += 0.1
        candles.append(
            {
                "timestamp": f"2026-01-01T00:{i:02d}:00Z",
                "open": price,
                "high": price + 0.05,
                "low": price - 0.05,
                "close": price + 0.02,
                "volume": 1000 + i,
            }
        )
    return candles


def test_returns_503_when_no_model_artifact_is_present(monkeypatch):
    # Real, un-mocked behavior: no trained artifact exists yet.
    monkeypatch.setattr(price_direction_module, "_model", None)
    monkeypatch.setattr(price_direction_module, "_load_attempted", False)

    response = client.post("/predict/price-direction", json={"candles": make_candles()})
    assert response.status_code == 503


def test_rejects_fewer_than_twenty_candles():
    response = client.post(
        "/predict/price-direction", json={"candles": make_candles(5)}
    )
    assert response.status_code == 422


def test_returns_a_probability_when_a_model_is_loaded(monkeypatch):
    class FakeModel:
        def predict_proba_up(self, df):
            assert len(df) == 25
            return 0.73

    monkeypatch.setattr(price_direction_module, "_model", FakeModel())

    response = client.post("/predict/price-direction", json={"candles": make_candles()})
    assert response.status_code == 200
    body = response.json()
    assert body["probability_up"] == 0.73
    assert body["advisory_only"] is True
    assert body["model_version"]  # non-empty


def test_translates_a_feature_computation_error_into_a_422(monkeypatch):
    class FakeModel:
        def predict_proba_up(self, df):
            raise ValueError("Not enough candles to compute features (need >= 20)")

    monkeypatch.setattr(price_direction_module, "_model", FakeModel())

    response = client.post("/predict/price-direction", json={"candles": make_candles()})
    assert response.status_code == 422
