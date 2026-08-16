import os
import sys
from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf


# ============================================================
# PROJECT ROOT
# ============================================================

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)


# ============================================================
# CONFIGURATION
# ============================================================

TICKER = "CL=F"

OIL_OUTPUT_PATH = os.path.join(
    PROJECT_ROOT,
    "data",
    "oil_prices.csv"
)

START_DATE = "2022-04-01"


# ============================================================
# DOWNLOAD OIL DATA
# ============================================================

def download_oil_data():

    print("====================================")
    print("       InsightIQ Oil Ingestion")
    print("====================================")

    print("\nDownloading WTI crude oil data...")
    print(f"Ticker: {TICKER}")
    print(f"Start date: {START_DATE}")

    # Tomorrow is used as the end date because
    # yfinance treats the end date as exclusive.
    end_date = (
        datetime.now() + timedelta(days=1)
    ).strftime("%Y-%m-%d")

    print(
        f"End date: {end_date}"
    )

    oil = yf.download(
        TICKER,
        start=START_DATE,
        end=end_date,
        auto_adjust=False,
        progress=False
    )

    if oil.empty:
        raise ValueError(
            "No crude-oil data was downloaded."
        )

    # ========================================================
    # HANDLE YFINANCE MULTIINDEX
    # ========================================================

    if isinstance(
        oil.columns,
        pd.MultiIndex
    ):

        oil.columns = (
            oil.columns
            .get_level_values(0)
        )

    # ========================================================
    # RESET INDEX
    # ========================================================

    oil = oil.reset_index()

    # ========================================================
    # VALIDATE REQUIRED COLUMNS
    # ========================================================

    required_columns = [
        "Date",
        "Close"
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in oil.columns
    ]

    if missing_columns:

        raise ValueError(
            f"Missing columns from "
            f"Yahoo Finance data: "
            f"{missing_columns}"
        )

    # ========================================================
    # KEEP REQUIRED DATA
    # ========================================================

    oil = oil[
        [
            "Date",
            "Close"
        ]
    ].copy()

    # ========================================================
    # RENAME COLUMNS
    # ========================================================

    oil = oil.rename(
        columns={
            "Date": "date",
            "Close": "oil_price"
        }
    )

    # ========================================================
    # CLEAN DATE
    # ========================================================

    oil["date"] = pd.to_datetime(
        oil["date"],
        errors="coerce"
    ).dt.date

    # ========================================================
    # CLEAN PRICE
    # ========================================================

    oil["oil_price"] = pd.to_numeric(
        oil["oil_price"],
        errors="coerce"
    )

    # ========================================================
    # REMOVE INVALID ROWS
    # ========================================================

    oil = oil.dropna(
        subset=[
            "date",
            "oil_price"
        ]
    )

    # ========================================================
    # REMOVE DUPLICATE DATES
    # ========================================================

    oil = oil.drop_duplicates(
        subset=["date"],
        keep="last"
    )

    # ========================================================
    # SORT CHRONOLOGICALLY
    # ========================================================

    oil = oil.sort_values(
        "date"
    ).reset_index(
        drop=True
    )

    # ========================================================
    # CREATE OUTPUT DIRECTORY
    # ========================================================

    output_directory = os.path.dirname(
        OIL_OUTPUT_PATH
    )

    os.makedirs(
        output_directory,
        exist_ok=True
    )

    # ========================================================
    # SAVE CSV
    # ========================================================

    oil.to_csv(
        OIL_OUTPUT_PATH,
        index=False
    )

    # ========================================================
    # SUMMARY
    # ========================================================

    print("\nOil data updated successfully!")
    print("------------------------------------")

    print(
        f"Rows: {len(oil)}"
    )

    print(
        f"Date range: "
        f"{oil['date'].min()} → "
        f"{oil['date'].max()}"
    )

    print(
        f"Latest oil price: "
        f"${oil['oil_price'].iloc[-1]:.2f}"
    )

    print(
        f"\nFile saved:"
    )

    print(
        OIL_OUTPUT_PATH
    )

    print("\nLatest records:")
    print(
        oil.tail(5).to_string(
            index=False
        )
    )

    print(
        "\n===================================="
    )
    print(
        "       OIL INGESTION COMPLETE"
    )
    print(
        "===================================="
    )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    download_oil_data()