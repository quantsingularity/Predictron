import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from routers import price_direction, risk_signals  # noqa: E402

app = FastAPI(
    title="Predictron AI Inference Service",
    description="Advisory-only signals: a price-direction probability and a withdrawal risk score. "
    "Nothing here can move funds or settle a prediction round, see ../../README.md.",
    version="1.0.0",
)

# Only the internal backend calls this service, lock CORS accordingly
# rather than defaulting to '*'.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("BACKEND_ORIGIN", "http://localhost:4000")],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(price_direction.router)
app.include_router(risk_signals.router)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}
