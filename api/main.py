from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from prediction.predict import get_prediction
from prediction.feature_builder import build_latest_features
from database.connection import get_database_engine

import pandas as pd


app = FastAPI(
    title="InsightIQ AI API",
    description="AI-powered USD/INR prediction and analytics API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "project": "InsightIQ AI",
        "status": "running",
        "message": "InsightIQ AI API is working"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health_check():

    return {
        "status": "healthy"
    }


# ============================================================
# AI PREDICTION
# ============================================================

@app.get("/api/prediction")
def prediction():

    return get_prediction()


# ============================================================
# HISTORICAL USD/INR DATA
# ============================================================

@app.get("/api/history")
def history():

    engine = get_database_engine()

    query = """
        SELECT
            date,
            usd_inr
        FROM rbi_exchange_rates
        WHERE usd_inr IS NOT NULL
        ORDER BY date;
    """

    df = pd.read_sql(
        query,
        engine
    )

    df["date"] = pd.to_datetime(
        df["date"]
    )

    data = []

    for _, row in df.iterrows():

        data.append({

            "date": row["date"].strftime(
                "%Y-%m-%d"
            ),

            "usd_inr": round(
                float(row["usd_inr"]),
                4
            )
        })

    return {

        "count": len(data),

        "data": data

    }


# ============================================================
# LATEST MODEL FEATURES
# ============================================================

@app.get("/api/features")
def features():

    latest, input_data = build_latest_features()

    feature_names = list(
        input_data.columns
    )

    return {

        "date": str(
            latest["date"].date()
        ),

        "usd_inr": round(
            float(latest["usd_inr"]),
            4
        ),

        "features": {

            "count": len(
                feature_names
            ),

            "names": feature_names

        }
    }


# ============================================================
# MARKET SIGNALS
# ============================================================

@app.get("/api/signals")
def signals():

    latest, input_data = build_latest_features()

    return {

        "date": str(
            latest["date"].date()
        ),

        "usd_inr": round(
            float(latest["usd_inr"]),
            4
        ),

        "oil": {

            "price": round(
                float(latest["oil_price"]),
                4
            ),

            "return_1d": round(
                float(latest["oil_return_1d"]),
                4
            ),

            "return_7d": round(
                float(latest["oil_return_7d"]),
                4
            ),

            "return_30d": round(
                float(latest["oil_return_30d"]),
                4
            ),

            "ma_7": round(
                float(latest["oil_ma_7"]),
                4
            ),

            "ma_30": round(
                float(latest["oil_ma_30"]),
                4
            ),

            "volatility_7": round(
                float(latest["oil_volatility_7"]),
                4
            ),

            "volatility_30": round(
                float(latest["oil_volatility_30"]),
                4
            )

        },

        "features": {

            "count": len(
                input_data.columns
            ),

            "names": list(
                input_data.columns
            )

        }

    }