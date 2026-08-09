from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def score(**overrides):
    activity = {
        "user_address": "0x1111111111111111111111111111111111111111",
        "withdrawals_last_24h": 0,
        "total_amount_last_24h": 0.0,
        "account_age_days": 365.0,
        "distinct_destination_addresses_last_24h": 0,
        **overrides,
    }
    response = client.post("/risk/withdrawal-score", json={"activity": activity})
    assert response.status_code == 200
    return response.json()


def test_clean_established_account_scores_zero():
    result = score()
    assert result["risk_score"] == 0.0
    assert result["reasons"] == ["No risk heuristics triggered"]
    assert result["advisory_only"] is True


def test_brand_new_account_flagged():
    result = score(account_age_days=0.5)
    assert result["risk_score"] == 0.35
    assert "less than 24 hours old" in result["reasons"][0]


def test_young_account_flagged_lower_than_brand_new():
    result = score(account_age_days=3)
    assert result["risk_score"] == 0.15
    assert "less than 7 days old" in result["reasons"][0]


def test_many_withdrawals_flagged():
    result = score(withdrawals_last_24h=5)
    assert result["risk_score"] == 0.25


def test_many_destination_addresses_flagged():
    result = score(distinct_destination_addresses_last_24h=3)
    assert result["risk_score"] == 0.2


def test_new_account_with_rapid_withdrawals_combo_rule():
    # age < 7 (+0.15) AND the age<3-with-withdrawals combo rule (+0.2);
    # withdrawal count itself stays below the separate >=5 threshold.
    result = score(account_age_days=2, withdrawals_last_24h=3, total_amount_last_24h=500)
    assert result["risk_score"] == 0.35
    assert len(result["reasons"]) == 2

def test_score_never_exceeds_one_even_when_every_heuristic_fires():
    result = score(
        account_age_days=0.1,
        withdrawals_last_24h=10,
        total_amount_last_24h=5000,
        distinct_destination_addresses_last_24h=5,
    )
    assert result["risk_score"] == 1.0
    assert len(result["reasons"]) == 4


def test_rejects_a_malformed_request():
    response = client.post("/risk/withdrawal-score", json={"activity": {"user_address": "0xabc"}})
    assert response.status_code == 422
