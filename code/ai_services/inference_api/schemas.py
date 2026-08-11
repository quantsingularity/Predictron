from datetime import datetime

from pydantic import BaseModel, Field


class Candle(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class PriceDirectionRequest(BaseModel):
    # Caller supplies the candle window; this service fetches no market data itself.
    candles: list[Candle] = Field(
        ..., min_length=20, description="Most recent candles, ascending by time"
    )


class PriceDirectionResponse(BaseModel):
    probability_up: float
    model_version: str
    advisory_only: bool = True


class WithdrawalActivity(BaseModel):
    user_address: str
    withdrawals_last_24h: int
    total_amount_last_24h: float
    account_age_days: float
    distinct_destination_addresses_last_24h: int


class RiskScoreRequest(BaseModel):
    activity: WithdrawalActivity


class RiskScoreResponse(BaseModel):
    risk_score: float = Field(..., ge=0.0, le=1.0)
    reasons: list[str]
    advisory_only: bool = True
