import time
from typing import Optional

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from prediction.predict import get_prediction
from prediction.feature_builder import build_latest_features
from database.connection import get_database_engine


app = FastAPI(
    title="InsightIQ AI API",
    description="AI-powered USD/INR prediction and analytics API",
    version="2.0.0",
)


# ============================================================
# MIDDLEWARE
# ============================================================

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATA HELPERS
# ============================================================

RATES_TABLE = "rbi_exchange_rates"
CACHE_SECONDS = 300

_CACHE = {"ts": 0.0, "df": None}


def num(value, digits=4):
    """Convert a value to a rounded float, or None if it is NaN/None."""
    if value is None or pd.isna(value):
        return None
    return round(float(value), digits)


def date_str(value):
    return pd.Timestamp(value).strftime("%Y-%m-%d")


def load_rates() -> pd.DataFrame:
    """Load the whole RBI rates table (cached for a few minutes)."""
    now = time.time()

    if _CACHE["df"] is not None and now - _CACHE["ts"] < CACHE_SECONDS:
        return _CACHE["df"]

    engine = get_database_engine()
    df = pd.read_sql(f"SELECT * FROM {RATES_TABLE} ORDER BY date", engine)

    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    _CACHE["df"] = df
    _CACHE["ts"] = now

    return df


def currency_columns(df: pd.DataFrame) -> list:
    """Every column that looks like <code>_inr (usd_inr, gbp_inr, ...)."""
    cols = [c for c in df.columns if str(c).lower().endswith("_inr")]

    if not cols and "usd_inr" in df.columns:
        cols = ["usd_inr"]

    return cols


def currency_label(code: str) -> str:
    return code.replace("_inr", "").replace("_INR", "").upper() + "/INR"


def get_series(currency: str) -> pd.DataFrame:
    df = load_rates()
    cols = currency_columns(df)

    if currency not in cols:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown currency '{currency}'. Available: {cols}",
        )

    series = (
        df[["date", currency]]
        .dropna()
        .rename(columns={currency: "rate"})
        .reset_index(drop=True)
    )

    if series.empty:
        raise HTTPException(status_code=404, detail="No data for this currency")

    return series


def enrich(series: pd.DataFrame) -> pd.DataFrame:
    """Add moving averages, daily change and rolling volatility."""
    s = series.copy()

    s["ma_7"] = s["rate"].rolling(7).mean()
    s["ma_30"] = s["rate"].rolling(30).mean()
    s["change_pct"] = s["rate"].pct_change() * 100
    s["volatility_30"] = s["change_pct"].rolling(30).std()

    return s


# ============================================================
# ROOT & HEALTH
# ============================================================

@app.get("/")
def root():
    return {
        "project": "InsightIQ AI",
        "status": "running",
        "message": "InsightIQ AI API is working",
    }


@app.get("/api/health")
def health_check():
    try:
        df = load_rates()
        return {
            "status": "healthy",
            "database": "connected",
            "rows": len(df),
            "last_date": date_str(df["date"].max()),
        }
    except Exception as exc:
        return {
            "status": "degraded",
            "database": "error",
            "detail": type(exc).__name__,
        }


# ============================================================
# AI PREDICTION
# ============================================================

@app.get("/api/prediction")
def prediction():
    return get_prediction()


# ============================================================
# CURRENCIES
# ============================================================

@app.get("/api/currencies")
def currencies():
    cols = currency_columns(load_rates())

    return {
        "currencies": [
            {"code": c, "label": currency_label(c)} for c in cols
        ]
    }


# ============================================================
# HISTORY (with moving averages and rolling volatility)
# ============================================================

@app.get("/api/history")
def history(
    currency: str = "usd_inr",
    days: Optional[int] = Query(None, ge=1),
):
    s = enrich(get_series(currency))

    if days:
        s = s[s["date"] >= s["date"].max() - pd.Timedelta(days=days)]

    rows = [
        {
            "date": date_str(d),
            "rate": num(rate),
            currency: num(rate),  # keeps old clients working for usd_inr
            "ma_7": num(ma7),
            "ma_30": num(ma30),
            "change_pct": num(chg, 4),
            "volatility_30": num(vol, 4),
        }
        for d, rate, ma7, ma30, chg, vol in zip(
            s["date"],
            s["rate"],
            s["ma_7"],
            s["ma_30"],
            s["change_pct"],
            s["volatility_30"],
        )
    ]

    return {"currency": currency, "count": len(rows), "data": rows}


# ============================================================
# STATS
# ============================================================

@app.get("/api/stats")
def stats(currency: str = "usd_inr"):
    s = enrich(get_series(currency))

    if len(s) < 2:
        raise HTTPException(status_code=404, detail="Not enough data")

    last = s.iloc[-1]
    prev = s.iloc[-2]

    year = s[s["date"] >= last["date"] - pd.Timedelta(days=365)]
    month = s[s["date"] >= last["date"] - pd.Timedelta(days=30)]

    high = year.loc[year["rate"].idxmax()]
    low = year.loc[year["rate"].idxmin()]

    changes = year.dropna(subset=["change_pct"])
    best = changes.loc[changes["change_pct"].idxmax()] if len(changes) else None
    worst = changes.loc[changes["change_pct"].idxmin()] if len(changes) else None

    # Volatility regime: compare today's 30-day volatility with its own history
    vol_history = s["volatility_30"].dropna()
    current_vol = last["volatility_30"]
    regime = "unknown"

    if len(vol_history) >= 60 and pd.notna(current_vol):
        low_cut, high_cut = vol_history.quantile([0.33, 0.66])
        if current_vol <= low_cut:
            regime = "low"
        elif current_vol >= high_cut:
            regime = "high"
        else:
            regime = "medium"

    def day_info(row):
        if row is None:
            return None
        return {"date": date_str(row["date"]), "change_pct": num(row["change_pct"], 3)}

    return {
        "currency": currency,
        "label": currency_label(currency),
        "latest": num(last["rate"]),
        "previous": num(prev["rate"]),
        "change": num(last["rate"] - prev["rate"]),
        "change_pct": num((last["rate"] / prev["rate"] - 1) * 100, 3),
        "last_date": date_str(last["date"]),
        "first_date": date_str(s["date"].iloc[0]),
        "data_points": int(len(s)),
        "high_52w": num(high["rate"]),
        "high_52w_date": date_str(high["date"]),
        "low_52w": num(low["rate"]),
        "low_52w_date": date_str(low["date"]),
        "avg_30d": num(month["rate"].mean()),
        "ma_7": num(last["ma_7"]),
        "ma_30": num(last["ma_30"]),
        "volatility_30": num(current_vol, 4),
        "regime": regime,
        "best_day": day_info(best),
        "worst_day": day_info(worst),
    }


# ============================================================
# MONTHLY TRENDS
# ============================================================

@app.get("/api/monthly")
def monthly(
    currency: str = "usd_inr",
    months: int = Query(24, ge=2, le=240),
):
    s = get_series(currency)

    s["month"] = s["date"].dt.to_period("M").astype(str)

    m = s.groupby("month", as_index=False)["rate"].mean()
    m["change_pct"] = m["rate"].pct_change() * 100
    m = m.tail(months)

    return {
        "currency": currency,
        "data": [
            {
                "month": row.month,
                "avg": num(row.rate),
                "change_pct": num(row.change_pct, 3),
            }
            for row in m.itertuples()
        ],
    }


# ============================================================
# CURRENCY COMPARISON (every currency rebased to 100)
# ============================================================

@app.get("/api/compare")
def compare(days: Optional[int] = Query(None, ge=1)):
    df = load_rates()
    cols = currency_columns(df)

    sub = df[["date"] + cols].copy()
    sub[cols] = sub[cols].ffill()

    if days:
        sub = sub[sub["date"] >= sub["date"].max() - pd.Timedelta(days=days)]

    sub = sub.dropna().reset_index(drop=True)

    if sub.empty:
        return {"currencies": cols, "data": []}

    for c in cols:
        sub[c] = sub[c] / sub[c].iloc[0] * 100

    data = []
    for row in sub.itertuples(index=False, name=None):
        item = {"date": date_str(row[0])}
        for code, value in zip(cols, row[1:]):
            item[code] = num(value, 3)
        data.append(item)

    return {"currencies": cols, "data": data}


# ============================================================
# LATEST MODEL FEATURES
# ============================================================

@app.get("/api/features")
def features():

    latest, input_data = build_latest_features()

    feature_names = list(input_data.columns)

    return {
        "date": str(latest["date"].date()),
        "usd_inr": round(float(latest["usd_inr"]), 4),
        "features": {
            "count": len(feature_names),
            "names": feature_names,
        },
    }


# ============================================================
# MARKET SIGNALS
# ============================================================

@app.get("/api/signals")
def signals():

    latest, input_data = build_latest_features()

    return {
        "date": str(latest["date"].date()),
        "usd_inr": round(float(latest["usd_inr"]), 4),
        "oil": {
            "price": round(float(latest["oil_price"]), 4),
            "return_1d": round(float(latest["oil_return_1d"]), 4),
            "return_7d": round(float(latest["oil_return_7d"]), 4),
            "return_30d": round(float(latest["oil_return_30d"]), 4),
            "ma_7": round(float(latest["oil_ma_7"]), 4),
            "ma_30": round(float(latest["oil_ma_30"]), 4),
            "volatility_7": round(float(latest["oil_volatility_7"]), 4),
            "volatility_30": round(float(latest["oil_volatility_30"]), 4),
        },
        "features": {
            "count": len(input_data.columns),
            "names": list(input_data.columns),
        },
    }