# fix_model.py  — run once, then delete
import pickle, joblib, sklearn

print("sklearn version:", sklearn.__version__)

# Try loading with joblib instead of pickle
try:
    model = joblib.load("complication_predictor.pkl")
    print("Loaded with joblib ✅")
except Exception as e:
    print("joblib failed:", e)
    # Fallback: raw pickle with encoding fix
    with open("complication_predictor.pkl", "rb") as f:
        model = pickle.load(f, fix_imports=True, encoding="latin1")
    print("Loaded with pickle latin1 ✅")

# Re-save with current version
with open("complication_predictor.pkl", "wb") as f:
    pickle.dump(model, f)

print("Re-saved successfully with sklearn", sklearn.__version__)