"""
ml/serve.py

Minimal FastAPI wrapper around the trained model. Run alongside your Node
server during the demo:

    uvicorn serve:app --port 8001

Node's decisionEngine.js calls POST http://localhost:8001/predict with the
same features used at training time and gets back a calibrated probability
plus the rules-engine score for side-by-side display in the audit trail.
"""

from pathlib import Path
from typing import Optional

import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel

# MODEL_PATH = Path(__file__).parent / "model" / "model.joblib"

MODEL_PATH = Path(__file__).parent / "model.joblib"

app = FastAPI(title="Vigil ML Scoring Service")
_bundle = None


@app.on_event("startup")
def load_model():
    global _bundle
    _bundle = joblib.load(MODEL_PATH)


class TransactionFeatures(BaseModel):
    amount: float
    currency: str = "INR"
    failureReason: str
    actionType: str
    retryCount: int
    hoursSinceCreated: float
    customerSuccessfulPayments: int
    customerFailedPayments: int
    customerSuccessRate: float
    customerDaysSinceSignup: int
    retrySpacingHours: Optional[float] = None
    customerSuccessStreak: Optional[int] = None


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _bundle is not None}


@app.post("/predict")
def predict(tx: TransactionFeatures):
    pipeline = _bundle["pipeline"]
    features = _bundle["features"]

    row = tx.dict()
    df = pd.DataFrame([{f: row.get(f) for f in features}])

    prob = float(pipeline.predict_proba(df)[0, 1])
    return {"recoveryProbability": round(prob, 4)}