from pathlib import Path

import joblib
import numpy as np
from flask import Flask, jsonify, request
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

import tensorflow as tf
from tensorflow import keras

APP_DIR = Path(__file__).resolve().parent
MODEL_DIR = APP_DIR / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)

ISO_PATH = MODEL_DIR / "isolation_forest.joblib"
SCALER_PATH = MODEL_DIR / "scaler.joblib"
AE_PATH = MODEL_DIR / "autoencoder.keras"

FEATURES = [
    "normalized_rank",
    "normalized_gpa",
    "normalized_entrance_score",
    "timing_delta_minutes",
    "override_flag",
    "document_completeness_flag",
    "category_encoding",
]


def synthetic_training_matrix(seed: int = 42) -> np.ndarray:
    rng = np.random.default_rng(seed)
    rows = 2000

    normalized_rank = rng.normal(0.42, 0.16, rows).clip(0.01, 0.99)
    normalized_gpa = rng.normal(0.72, 0.09, rows).clip(0.35, 1.0)
    normalized_entrance_score = rng.normal(0.68, 0.14, rows).clip(0.1, 1.0)
    timing_delta_minutes = rng.normal(640, 280, rows).clip(45, 4320)
    override_flag = rng.choice([0, 1], size=rows, p=[0.92, 0.08])
    document_completeness_flag = rng.choice([0, 1], size=rows, p=[0.1, 0.9])
    category_encoding = rng.integers(0, 5, rows)

    matrix = np.column_stack(
        [
            normalized_rank,
            normalized_gpa,
            normalized_entrance_score,
            timing_delta_minutes,
            override_flag,
            document_completeness_flag,
            category_encoding,
        ]
    )

    return matrix.astype(np.float32)


def build_autoencoder(input_dim: int) -> keras.Model:
    inputs = keras.Input(shape=(input_dim,))
    encoded = keras.layers.Dense(12, activation="relu")(inputs)
    encoded = keras.layers.Dense(6, activation="relu")(encoded)
    bottleneck = keras.layers.Dense(3, activation="relu")(encoded)
    decoded = keras.layers.Dense(6, activation="relu")(bottleneck)
    decoded = keras.layers.Dense(12, activation="relu")(decoded)
    outputs = keras.layers.Dense(input_dim, activation="linear")(decoded)

    model = keras.Model(inputs, outputs)
    model.compile(optimizer=keras.optimizers.Adam(learning_rate=0.001), loss="mse")
    return model


def train_models(matrix: np.ndarray):
    scaler = StandardScaler()
    x_scaled = scaler.fit_transform(matrix)

    iso = IsolationForest(n_estimators=300, contamination=0.1, random_state=42)
    iso.fit(x_scaled)

    autoencoder = build_autoencoder(x_scaled.shape[1])
    autoencoder.fit(
        x_scaled,
        x_scaled,
        epochs=22,
        batch_size=64,
        verbose=0,
        validation_split=0.1,
        shuffle=True,
    )

    joblib.dump(iso, ISO_PATH)
    joblib.dump(scaler, SCALER_PATH)
    autoencoder.save(AE_PATH)

    return iso, autoencoder, scaler


def load_or_train_models():
    if ISO_PATH.exists() and SCALER_PATH.exists() and AE_PATH.exists():
        iso = joblib.load(ISO_PATH)
        scaler = joblib.load(SCALER_PATH)
        autoencoder = keras.models.load_model(AE_PATH)
        return iso, autoencoder, scaler

    matrix = synthetic_training_matrix()
    return train_models(matrix)


def extract_feature_row(payload: dict) -> np.ndarray:
    if "features" in payload and isinstance(payload["features"], dict):
        source = payload["features"]
    else:
        source = payload.get("applicant", payload)

    row = [float(source.get(key, 0) or 0) for key in FEATURES]
    return np.array(row, dtype=np.float32).reshape(1, -1)


def to_score(value: float, lower: float, upper: float) -> float:
    if upper <= lower:
        return 0.0
    score = (value - lower) / (upper - lower)
    return float(np.clip(score * 100, 0, 100))


app = Flask(__name__)
ISO_MODEL, AUTOENCODER, SCALER = load_or_train_models()


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "autoguard-ml"})


@app.post("/predict")
def predict():
    global ISO_MODEL, AUTOENCODER, SCALER

    payload = request.get_json(silent=True) or {}
    x = extract_feature_row(payload)
    x_scaled = SCALER.transform(x)

    iso_decision = float(ISO_MODEL.decision_function(x_scaled)[0])
    isolation_score = to_score(-iso_decision, -0.45, 0.5)

    recon = AUTOENCODER.predict(x_scaled, verbose=0)
    recon_error = float(np.mean(np.square(x_scaled - recon)))
    autoencoder_error = to_score(recon_error, 0, 2.2)

    composite_ml_score = round((0.6 * isolation_score) + (0.4 * autoencoder_error), 2)

    return jsonify(
        {
            "isolation_score": round(isolation_score, 2),
            "autoencoder_error": round(autoencoder_error, 2),
            "composite_ml_score": composite_ml_score,
            "features_used": FEATURES,
        }
    )


@app.post("/retrain")
def retrain():
    global ISO_MODEL, AUTOENCODER, SCALER

    payload = request.get_json(silent=True) or {}
    dataset = payload.get("dataset")

    if dataset and isinstance(dataset, list):
        matrix = np.array(
            [[float(item.get(feature, 0) or 0) for feature in FEATURES] for item in dataset],
            dtype=np.float32,
        )
    else:
        matrix = synthetic_training_matrix(seed=84)

    ISO_MODEL, AUTOENCODER, SCALER = train_models(matrix)

    return jsonify({"status": "retrained", "samples": int(matrix.shape[0]), "features": FEATURES})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
