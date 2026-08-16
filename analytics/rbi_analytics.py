import pandas as pd

from database.connection import get_database_engine


def load_data():
    """Load RBI exchange-rate data from PostgreSQL."""

    engine = get_database_engine()

    query = """
        SELECT
            date,
            usd_inr,
            gbp_inr,
            eur_inr,
            jpy_inr,
            aed_inr,
            idr_inr
        FROM rbi_exchange_rates
        ORDER BY date;
    """

    df = pd.read_sql(query, engine)

    return df


def create_analytics(df):
    """Create advanced analytical features."""

    currency_columns = [
        "usd_inr",
        "gbp_inr",
        "eur_inr",
        "jpy_inr",
        "aed_inr",
        "idr_inr",
    ]

    # --------------------------------------------------
    # Daily percentage change
    # --------------------------------------------------

    for column in currency_columns:

        df[f"{column}_daily_change_pct"] = (
            df[column].pct_change() * 100
        )

    # --------------------------------------------------
    # Moving averages
    # --------------------------------------------------

    for column in currency_columns:

        df[f"{column}_ma_7"] = (
            df[column]
            .rolling(window=7)
            .mean()
        )

        df[f"{column}_ma_30"] = (
            df[column]
            .rolling(window=30)
            .mean()
        )

    # --------------------------------------------------
    # 30-day volatility
    # --------------------------------------------------

    for column in currency_columns:

        df[f"{column}_volatility_30"] = (
            df[f"{column}_daily_change_pct"]
            .rolling(window=30)
            .std()
        )

    # --------------------------------------------------
    # Rolling 30-day high and low
    # --------------------------------------------------

    for column in currency_columns:

        df[f"{column}_high_30"] = (
            df[column]
            .rolling(window=30)
            .max()
        )

        df[f"{column}_low_30"] = (
            df[column]
            .rolling(window=30)
            .min()
        )

    # --------------------------------------------------
    # USD/INR trend signal
    # --------------------------------------------------

    df["usd_trend"] = "Neutral"

    df.loc[
        df["usd_inr_ma_7"] > df["usd_inr_ma_30"],
        "usd_trend"
    ] = "Bullish"

    df.loc[
        df["usd_inr_ma_7"] < df["usd_inr_ma_30"],
        "usd_trend"
    ] = "Bearish"

    # --------------------------------------------------
    # USD/INR anomaly detection
    # --------------------------------------------------

    usd_mean = (
        df["usd_inr_daily_change_pct"]
        .rolling(window=30)
        .mean()
    )

    usd_std = (
        df["usd_inr_daily_change_pct"]
        .rolling(window=30)
        .std()
    )

    df["usd_anomaly"] = (
        (
            df["usd_inr_daily_change_pct"] > usd_mean + 2 * usd_std
        )
        |
        (
            df["usd_inr_daily_change_pct"] < usd_mean - 2 * usd_std
        )
    )

    return df

def show_summary(df):
    """Display advanced analytics."""

    print("\n====================================")
    print("       INSIGHTIQ ANALYTICS")
    print("====================================")

    print(f"\nTotal records: {len(df)}")

    print(
        f"Date range: "
        f"{df['date'].min()} → "
        f"{df['date'].max()}"
    )

    print("\nLatest exchange rates:")

    print(
        df[
            [
                "date",
                "usd_inr",
                "gbp_inr",
                "eur_inr",
                "jpy_inr",
                "aed_inr",
                "idr_inr",
            ]
        ]
        .tail(5)
        .to_string(index=False)
    )

    print("\nLatest USD/INR analytics:")

    print(
        df[
            [
                "date",
                "usd_inr",
                "usd_inr_daily_change_pct",
                "usd_inr_ma_7",
                "usd_inr_ma_30",
                "usd_inr_volatility_30",
                "usd_trend",
                "usd_anomaly",
            ]
        ]
        .tail(10)
        .to_string(index=False)
    )

    print("\nUSD/INR statistics:")

    print(
        df["usd_inr"].describe()
    )

    print("\nTrend distribution:")

    print(
        df["usd_trend"]
        .value_counts()
    )

    print("\nAnomalies detected:")

    print(
        df["usd_anomaly"]
        .value_counts()
    )


def main():

    print("Loading data from PostgreSQL...")

    df = load_data()

    print("Creating analytical features...")

    df = create_analytics(df)

    show_summary(df)


if __name__ == "__main__":
    main()