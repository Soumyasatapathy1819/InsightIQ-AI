import os
import joblib
import pandas as pd

from prediction.feature_builder import build_latest_features


MODEL_PATH = "models/insightiq_random_forest.pkl"


def load_model():
    """Load the trained Random Forest model."""

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}"
        )

    return joblib.load(MODEL_PATH)


def get_prediction():
    """
    Build the latest features and generate
    the next-day USD/INR prediction.
    """

    # ----------------------------------------
    # Load model
    # ----------------------------------------

    model = load_model()

    # ----------------------------------------
    # Build latest features
    # ----------------------------------------

    latest, input_data = build_latest_features()

    # ----------------------------------------
    # Validate features
    # ----------------------------------------

    if not hasattr(model, "feature_names_in_"):
        raise AttributeError(
            "Model does not contain feature_names_in_"
        )

    model_features = list(model.feature_names_in_)

    if list(input_data.columns) != model_features:
        raise ValueError(
            "Input feature order does not match model."
        )

    if input_data.isnull().any().any():
        raise ValueError(
            "Input contains missing values."
        )

    # ----------------------------------------
    # Predict next-day return
    # ----------------------------------------

    predicted_return = float(
        model.predict(input_data)[0]
    )

    # ----------------------------------------
    # Current USD/INR
    # ----------------------------------------

    current_usd_inr = float(
        latest["usd_inr"]
    )

    # ----------------------------------------
    # Convert return to predicted USD/INR
    # ----------------------------------------

    predicted_usd_inr = current_usd_inr * (
        1 + predicted_return / 100
    )

    expected_change = (
        predicted_usd_inr - current_usd_inr
    )

    # ----------------------------------------
    # Determine direction
    # ----------------------------------------

    if predicted_usd_inr > current_usd_inr:
        direction = "UP"

    elif predicted_usd_inr < current_usd_inr:
        direction = "DOWN"

    else:
        direction = "UNCHANGED"

    # ----------------------------------------
    # Return API-friendly result
    # ----------------------------------------

    return {
        "prediction_date": str(
            latest["date"].date()
        ),
        "current_usd_inr": round(
            current_usd_inr, 4
        ),
        "predicted_return_percent": round(
            predicted_return, 4
        ),
        "predicted_usd_inr": round(
            predicted_usd_inr, 4
        ),
        "expected_change": round(
            expected_change, 4
        ),
        "direction": direction
    }


def main():

    print("====================================")
    print("       INSIGHTIQ PREDICTION")
    print("====================================")

    print("\nBuilding latest prediction...")

    result = get_prediction()

    print("\n====================================")
    print("       PREDICTION RESULT")
    print("====================================")

    print(
        f"\nPrediction date: "
        f"{result['prediction_date']}"
    )

    print(
        f"Current USD/INR: "
        f"₹{result['current_usd_inr']:.4f}"
    )

    print(
        f"Predicted next-day return: "
        f"{result['predicted_return_percent']:.4f}%"
    )

    print(
        f"Predicted next-day USD/INR: "
        f"₹{result['predicted_usd_inr']:.4f}"
    )

    print(
        f"Expected change: "
        f"₹{result['expected_change']:+.4f}"
    )

    print(
        f"Predicted direction: "
        f"{result['direction']}"
    )

    print("\n====================================")
    print("       PREDICTION COMPLETE")
    print("====================================")


if __name__ == "__main__":
    main()