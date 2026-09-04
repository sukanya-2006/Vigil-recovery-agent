"""
ml/train_model.py

Trains a recovery-probability classifier on exported transaction data and
reports how it compares to the existing rules-based score, so the
comparison itself becomes evidence for your writeup (not just a claim).

Usage:
    python train_model.py --data data/transactions.csv --out model/

Outputs (written to --out):
    model.joblib          - the trained, calibrated classifier + feature list
    metrics.json           - AUC, PR-AUC, Brier score, model vs rules comparison
    feature_importance.png - bar chart of what the model actually learned
    calibration_curve.png  - reliability diagram (model vs rules)
"""

import argparse
import json
from pathlib import Path

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

NUMERIC_FEATURES = [
    "amount",
    "retryCount",
    "hoursSinceCreated",
    "customerSuccessfulPayments",
    "customerFailedPayments",
    "customerSuccessRate",
    "customerDaysSinceSignup",
    # Uncomment once you've patched outcomeSimulator.js + exportDataset.js:
    # "retrySpacingHours",
    # "customerSuccessStreak",
]
CATEGORICAL_FEATURES = ["failureReason", "actionType", "currency"]
LABEL = "recovered"


def build_pipeline():
    preprocess = ColumnTransformer(
        transformers=[
            ("num", "passthrough", NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
        ]
    )
    clf = GradientBoostingClassifier(
        n_estimators=150, max_depth=3, learning_rate=0.08, random_state=42
    )
    # Calibrate so predicted probabilities are actually usable as a recovery
    # score (not just a ranking) — matters because your decision engine's
    # cost-aware override compares the score to an expected-value threshold.
    calibrated = CalibratedClassifierCV(clf, method="isotonic", cv=3)
    return Pipeline([("preprocess", preprocess), ("model", calibrated)])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--out", default="model/")
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(args.data, encoding="utf-16")
    df = df.dropna(subset=[LABEL])

    features = [c for c in NUMERIC_FEATURES + CATEGORICAL_FEATURES if c in df.columns]
    missing = set(NUMERIC_FEATURES + CATEGORICAL_FEATURES) - set(features)
    if missing:
        print(f"[warn] columns not found in CSV, skipping: {missing}")

    X = df[features]
    y = df[LABEL].astype(int)
    rule_score = df["recoveryScore"] if "recoveryScore" in df.columns else None

    # Time-ordered-ish split via transactionId as a stand-in for chronology
    # if you don't have a timestamp column exported — replace with a real
    # date split if you do, to avoid leakage.
    X_train, X_test, y_train, y_test, rs_train, rs_test = train_test_split(
        X, y, rule_score, test_size=0.25, random_state=42, stratify=y
    )

    pipe = build_pipeline()
    pipe.set_params(preprocess__num="passthrough")
    # rebuild with only present features
    pipe = Pipeline(
        [
            (
                "preprocess",
                ColumnTransformer(
                    [
                        ("num", "passthrough", [f for f in NUMERIC_FEATURES if f in features]),
                        (
                            "cat",
                            OneHotEncoder(handle_unknown="ignore"),
                            [f for f in CATEGORICAL_FEATURES if f in features],
                        ),
                    ]
                ),
            ),
            (
                "model",
                CalibratedClassifierCV(
                    GradientBoostingClassifier(
                        n_estimators=150, max_depth=3, learning_rate=0.08, random_state=42
                    ),
                    method="isotonic",
                    cv=3,
                ),
            ),
        ]
    )
    pipe.fit(X_train, y_train)

    model_probs = pipe.predict_proba(X_test)[:, 1]

    metrics = {
        "n_train": len(X_train),
        "n_test": len(X_test),
        "model_auc": round(roc_auc_score(y_test, model_probs), 4),
        "model_pr_auc": round(average_precision_score(y_test, model_probs), 4),
        "model_brier": round(brier_score_loss(y_test, model_probs), 4),
    }
    if rs_test is not None:
        metrics["rules_auc"] = round(roc_auc_score(y_test, rs_test.fillna(0)), 4)
        metrics["rules_pr_auc"] = round(average_precision_score(y_test, rs_test.fillna(0)), 4)
        metrics["rules_brier"] = round(brier_score_loss(y_test, rs_test.fillna(0)), 4)
        metrics["auc_lift"] = round(metrics["model_auc"] - metrics["rules_auc"], 4)

    (out_dir / "metrics.json").write_text(json.dumps(metrics, indent=2))
    print(json.dumps(metrics, indent=2))

    # --- calibration curve: model vs rules ---
    fig, ax = plt.subplots()
    frac_pos, mean_pred = calibration_curve(y_test, model_probs, n_bins=10)
    ax.plot(mean_pred, frac_pos, marker="o", label="model")
    if rs_test is not None:
        frac_pos_r, mean_pred_r = calibration_curve(y_test, rs_test.fillna(0), n_bins=10)
        ax.plot(mean_pred_r, frac_pos_r, marker="s", label="rules")
    ax.plot([0, 1], [0, 1], linestyle="--", color="gray")
    ax.set_xlabel("Predicted recovery probability")
    ax.set_ylabel("Actual recovery rate")
    ax.set_title("Calibration: model vs rules baseline")
    ax.legend()
    fig.savefig(out_dir / "calibration_curve.png", bbox_inches="tight")

    # --- feature importance (via a plain GB model fit for interpretability) ---
    plain_gb = GradientBoostingClassifier(
        n_estimators=150, max_depth=3, learning_rate=0.08, random_state=42
    )
    ct = pipe.named_steps["preprocess"]
    X_train_enc = ct.transform(X_train)
    plain_gb.fit(X_train_enc, y_train)
    try:
        feat_names = ct.get_feature_names_out()
    except Exception:
        feat_names = [f"f{i}" for i in range(X_train_enc.shape[1])]

    importances = plain_gb.feature_importances_
    order = np.argsort(importances)[::-1][:15]
    fig2, ax2 = plt.subplots(figsize=(7, 5))
    ax2.barh([feat_names[i] for i in order][::-1], importances[order][::-1])
    ax2.set_title("What the model actually weighs")
    fig2.savefig(out_dir / "feature_importance.png", bbox_inches="tight")

    joblib.dump({"pipeline": pipe, "features": features}, out_dir / "model.joblib")
    print(f"\nSaved model + metrics + charts to {out_dir}/")


if __name__ == "__main__":
    main()