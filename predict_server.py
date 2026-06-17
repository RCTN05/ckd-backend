import os, pickle, json, zipfile, tempfile, numpy as np, pandas as pd
from flask import Flask, request, jsonify

app = Flask(__name__)

# ── 1. Existing CKD model ─────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), "complication_predictor.pkl")
with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    features = np.array([[
        float(data.get("blood_pressure", 0)),
        float(data.get("heart_rate",     0)),
        float(data.get("blood_urea",     0)),
        float(data.get("creatinine",     0)),
        float(data.get("hemoglobin",     0)),
        1 if data.get("complications") == "Yes" else 0,
    ]])
    prob       = model.predict_proba(features)[0][1]
    prediction = model.predict(features)[0]
    risk_level = "High" if prob >= 0.7 else "Medium" if prob >= 0.4 else "Low"
    return jsonify({
        "prediction":  str(prediction),
        "probability": round(float(prob), 4),
        "risk_level":  risk_level,
    })

@app.route("/health")
def health():
    return jsonify({"status": "ok"})

# ── 2. LSTM Hypotension model ─────────────────────────────────────────────────
LSTM_ZIP = os.path.join(os.path.dirname(__file__), "lstm_hypotension_model.zip")
_lstm_model  = None
_lstm_tmpdir = None

# NEW
FEATURE_COLS = ["sys_bp", "dia_bp", "hr", "cum_fluid_ml", "removal_ml"]
SEQ_LEN = 10

def load_lstm_model():
    global _lstm_model, _lstm_tmpdir
    if _lstm_model is not None:
        return _lstm_model

    _lstm_tmpdir = tempfile.mkdtemp()
    with zipfile.ZipFile(LSTM_ZIP, "r") as z:
        z.extractall(_lstm_tmpdir)

    config_path  = os.path.join(_lstm_tmpdir, "config.json")
    weights_path = os.path.join(_lstm_tmpdir, "model.weights.h5")

    import keras
    with open(config_path) as f:
        config = json.load(f)

    # Fix: remove shared_object_id from Orthogonal initializers
    for layer in config["config"]["layers"]:
        for key in ["kernel_initializer", "recurrent_initializer", "bias_initializer"]:
            init = layer["config"].get(key)
            if init and isinstance(init, dict):
                init.pop("shared_object_id", None)

    _lstm_model = keras.models.model_from_json(json.dumps(config))
    _lstm_model.load_weights(weights_path)
    print("[LSTM] Hypotension model loaded OK")
    return _lstm_model

def make_sequences(df):
    """Slide SEQ_LEN window over feature columns."""
    X = df[FEATURE_COLS].fillna(0).values.astype(np.float32)
    sequences, row_indices = [], []
    for i in range(len(X) - SEQ_LEN + 1):
        sequences.append(X[i : i + SEQ_LEN])
        row_indices.append(i + SEQ_LEN - 1)
    return np.array(sequences), row_indices

@app.route("/predict-hypotension", methods=["POST"])
def predict_hypotension():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded — send CSV as multipart field 'file'"}), 400

        df = pd.read_csv(request.files["file"])

        missing = [c for c in FEATURE_COLS if c not in df.columns]
        if missing:
            return jsonify({"error": f"CSV missing columns: {missing}"}), 400

        lstm = load_lstm_model()
        X, row_indices = make_sequences(df)

        if len(X) == 0:
            return jsonify({"error": f"CSV needs at least {SEQ_LEN} rows"}), 400

        probs = lstm.predict(X, verbose=0).flatten().tolist()

        predictions = []
        for row_idx, prob in zip(row_indices, probs):
            predictions.append({
                "row":      int(row_idx),
                "time_min": int(df.iloc[row_idx]["time_min"]) if "time_min" in df.columns else row_idx,
                "prob":     round(float(prob), 4),
                "risk":     "High" if prob >= 0.5 else "Low",
            })

        high_risk = [p for p in predictions if p["risk"] == "High"]

        return jsonify({
            "total":           len(predictions),
            "high_risk_count": len(high_risk),
            "predictions":     predictions,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ── 3. Start ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5000))
    app.run(port=port, debug=False)