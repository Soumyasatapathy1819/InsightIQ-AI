import os
import sys
import pandas as pd


# ============================================================
# PROJECT ROOT
# ============================================================

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


from database.connection import get_database_engine


# ============================================================
# MODEL FEATURES
# ============================================================

FEATURES = [
    "usd_lag_1",
    "usd_lag_2",
    "usd_lag_3",
    "usd_lag_7",
    "usd_lag_14",
    "usd_lag_30",
    "usd_ma_7",
    "usd_ma_30",
    "usd_volatility_7",
    "usd_volatility_30",
    "oil_price",
    "oil_return_1d",
    "oil_return_7d",
    "oil_return_30d",
    "oil_ma_7",
    "oil_ma_30",
    "oil_ma7_distance",
    "oil_ma30_distance",
    "oil_volatility_7",
    "oil_volatility_30",
]


# ============================================================
# LOAD RBI DATA
# ============================================================

def load_rbi_data():

    print("Loading RBI data from PostgreSQL...")

    engine = get_database_engine()

    query = """
        SELECT
            date,
            usd_inr
        FROM rbi_exchange_rates
        ORDER BY date;
    """

    df = pd.read_sql(query, engine)

    df["date"] = pd.to_datetime(df["date"])

    df = df.sort_values(
        "date"
    ).reset_index(drop=True)

    return df


# ============================================================
# LOAD OIL DATA
# ============================================================

def load_oil_data():

    oil_path = os.path.join(
        PROJECT_ROOT,
        "data",
        "oil_prices.csv"
    )

    if not os.path.exists(oil_path):
        raise FileNotFoundError(
            f"Oil data not found: {oil_path}"
        )

    print("Loading oil data...")

    oil = pd.read_csv(oil_path)

    oil["date"] = pd.to_datetime(
        oil["date"]
    )

    oil = oil.sort_values(
        "date"
    ).reset_index(drop=True)

    return oil


# ============================================================
# CREATE USD FEATURES
# ============================================================

def create_usd_features(df):

    df = df.copy()

    df = df.sort_values(
        "date"
    ).reset_index(drop=True)

    # Lag features

    df["usd_lag_1"] = (
        df["usd_inr"].shift(1)
    )

    df["usd_lag_2"] = (
        df["usd_inr"].shift(2)
    )

    df["usd_lag_3"] = (
        df["usd_inr"].shift(3)
    )

    df["usd_lag_7"] = (
        df["usd_inr"].shift(7)
    )

    df["usd_lag_14"] = (
        df["usd_inr"].shift(14)
    )

    df["usd_lag_30"] = (
        df["usd_inr"].shift(30)
    )

    # Moving averages

    df["usd_ma_7"] = (
        df["usd_inr"]
        .rolling(window=7)
        .mean()
    )

    df["usd_ma_30"] = (
        df["usd_inr"]
        .rolling(window=30)
        .mean()
    )

    # Daily return

    usd_return = (
        df["usd_inr"].pct_change() * 100
    )

    # Volatility

    df["usd_volatility_7"] = (
        usd_return
        .rolling(window=7)
        .std()
    )

    df["usd_volatility_30"] = (
        usd_return
        .rolling(window=30)
        .std()
    )

    return df


# ============================================================
# CREATE OIL FEATURES
# ============================================================

def create_oil_features(oil):

    oil = oil.copy()

    oil = oil.sort_values(
        "date"
    ).reset_index(drop=True)

    if "oil_price" not in oil.columns:

        if "Close" in oil.columns:
            oil = oil.rename(
                columns={
                    "Close": "oil_price"
                }
            )

        elif "close" in oil.columns:
            oil = oil.rename(
                columns={
                    "close": "oil_price"
                }
            )

        elif "price" in oil.columns:
            oil = oil.rename(
                columns={
                    "price": "oil_price"
                }
            )

        else:
            raise ValueError(
                "Oil price column not found."
            )

    # Returns

    oil["oil_return_1d"] = (
        oil["oil_price"].pct_change() * 100
    )

    oil["oil_return_7d"] = (
        oil["oil_price"].pct_change(7) * 100
    )

    oil["oil_return_30d"] = (
        oil["oil_price"].pct_change(30) * 100
    )

    # Moving averages

    oil["oil_ma_7"] = (
        oil["oil_price"]
        .rolling(window=7)
        .mean()
    )

    oil["oil_ma_30"] = (
        oil["oil_price"]
        .rolling(window=30)
        .mean()
    )

    # Distance from moving averages

    oil["oil_ma7_distance"] = (
        oil["oil_price"]
        - oil["oil_ma_7"]
    )

    oil["oil_ma30_distance"] = (
        oil["oil_price"]
        - oil["oil_ma_30"]
    )

    # Volatility

    oil["oil_volatility_7"] = (
        oil["oil_return_1d"]
        .rolling(window=7)
        .std()
    )

    oil["oil_volatility_30"] = (
        oil["oil_return_1d"]
        .rolling(window=30)
        .std()
    )

    return oil


# ============================================================
# BUILD LATEST MODEL INPUT
# ============================================================

def build_latest_features():

    rbi = load_rbi_data()

    print(
        f"RBI rows loaded: {len(rbi)}"
    )

    print("Creating USD features...")

    rbi = create_usd_features(rbi)

    oil = load_oil_data()

    print(
        f"Oil rows loaded: {len(oil)}"
    )

    print("Creating oil features...")

    oil = create_oil_features(oil)

    print("Merging RBI and oil data...")

    combined = pd.merge(
        rbi,
        oil,
        on="date",
        how="inner"
    )

    combined = (
        combined
        .sort_values("date")
        .reset_index(drop=True)
    )

    print(
        f"Combined rows: {len(combined)}"
    )

    model_data = combined.dropna(
        subset=FEATURES
    ).copy()

    if model_data.empty:
        raise ValueError(
            "No valid rows remain after "
            "feature creation."
        )

    print(
        f"Complete feature rows: "
        f"{len(model_data)}"
    )

    latest = model_data.iloc[-1]

    input_data = pd.DataFrame(
        [
            [
                latest[feature]
                for feature in FEATURES
            ]
        ],
        columns=FEATURES
    )

    if input_data.shape != (1, 20):

        raise ValueError(
            f"Unexpected input shape: "
            f"{input_data.shape}"
        )

    if list(input_data.columns) != FEATURES:

        raise ValueError(
            "Feature order does not "
            "match model."
        )

    if input_data.isnull().any().any():

        missing_columns = (
            input_data.columns[
                input_data.isnull().any()
            ].tolist()
        )

        raise ValueError(
            f"Missing values found in: "
            f"{missing_columns}"
        )

    return latest, input_data


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    latest, input_data = (
        build_latest_features()
    )

    print("\n====================================")
    print("       FEATURE BUILDER TEST")
    print("====================================")

    print(
        f"\nLatest date: "
        f"{latest['date'].date()}"
    )

    print(
        f"Current USD/INR: "
        f"{latest['usd_inr']:.4f}"
    )

    print(
        f"\nInput shape: "
        f"{input_data.shape}"
    )

    print(
        "\nInput columns match model:"
    )

    print(
        list(input_data.columns) == FEATURES
    )

    print("\nFeatures:")

    print(
        input_data.to_string(
            index=False
        )
    )

    print(
        "\nFeature builder "
        "working successfully!"
    )