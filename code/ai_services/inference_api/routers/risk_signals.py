from fastapi import APIRouter
from schemas import RiskScoreRequest, RiskScoreResponse

router = APIRouter(prefix="/risk", tags=["risk-signals"])

# Rule-based, not a trained model: explainable heuristics an admin can
# read directly.


@router.post("/withdrawal-score", response_model=RiskScoreResponse)
def score_withdrawal_activity(request: RiskScoreRequest) -> RiskScoreResponse:
    a = request.activity
    score = 0.0
    reasons: list[str] = []

    if a.account_age_days < 1:
        score += 0.35
        reasons.append("Account is less than 24 hours old")
    elif a.account_age_days < 7:
        score += 0.15
        reasons.append("Account is less than 7 days old")

    if a.withdrawals_last_24h >= 5:
        score += 0.25
        reasons.append(f"{a.withdrawals_last_24h} withdrawals in the last 24h")

    if a.distinct_destination_addresses_last_24h >= 3:
        score += 0.2
        reasons.append(
            f"Funds sent to {a.distinct_destination_addresses_last_24h} distinct addresses in 24h"
        )

    if (
        a.total_amount_last_24h > 0
        and a.account_age_days < 3
        and a.withdrawals_last_24h >= 2
    ):
        score += 0.2
        reasons.append("New account with multiple rapid withdrawals")

    score = min(score, 1.0)
    if not reasons:
        reasons.append("No risk heuristics triggered")

    return RiskScoreResponse(risk_score=round(score, 2), reasons=reasons)
