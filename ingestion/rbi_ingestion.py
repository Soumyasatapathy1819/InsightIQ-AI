import glob
import os

import pandas as pd
from sqlalchemy import text

from database.connection import get_database_engine


# ============================================================
# CONFIGURATION
# ============================================================

DATA_PATH = "data/raw/*.xls"

REQUIRED_COLUMNS = [
    "Date",
    "USD (INR / 1 USD)",
    "GBP (INR / 1 GBP)",
    "EUR (INR / 1 EUR)",
    "JPY (INR / 100 JPY)",
    "AED (INR / 1 AED)",
    "IDR (INR / 10000 IDR)",
]


# ============================================================
# FIND RBI FILE
# ============================================================

def find_latest_rbi_file():
    """
    Find the most recently modified RBI XLS file.
    """

    files = glob.glob(DATA_PATH)

    if not files:
        raise FileNotFoundError(
            "No RBI .xls file found inside data/raw/"
        )

    files.sort(
        key=os.path.getmtime,
        reverse=True
    )

    file_path = files[0]

    print(f"Using RBI file: {file_path}")

    return file_path


# ============================================================
# READ RBI FILE
# ============================================================

def read_rbi_file():
    """
    Read the RBI/FBIL HTML-based XLS file.
    """

    file_path = find_latest_rbi_file()

    print("Reading RBI reference-rate file...")

    tables = pd.read_html(file_path)

    if not tables:
        raise ValueError(
            "No table found in RBI file."
        )

    df = tables[0]

    print(
        f"Raw rows detected: {len(df)}"
    )

    return df


# ============================================================
# CLEAN RBI DATA
# ============================================================

def clean_rbi_data(df):
    """
    Clean and transform RBI exchange-rate data.
    """

    df = df.copy()

    # --------------------------------------------------------
    # First row contains actual column names
    # --------------------------------------------------------

    df.columns = df.iloc[0]

    df = df.iloc[1:].copy()

    # --------------------------------------------------------
    # Validate expected columns
    # --------------------------------------------------------

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:

        raise ValueError(
            "RBI file format has changed.\n"
            f"Missing columns: {missing_columns}\n"
            f"Available columns: {list(df.columns)}"
        )

    # --------------------------------------------------------
    # Rename columns
    # --------------------------------------------------------

    df = df.rename(
        columns={
            "Date": "date",
            "USD (INR / 1 USD)": "usd_inr",
            "GBP (INR / 1 GBP)": "gbp_inr",
            "EUR (INR / 1 EUR)": "eur_inr",
            "JPY (INR / 100 JPY)": "jpy_inr",
            "AED (INR / 1 AED)": "aed_inr",
            "IDR (INR / 10000 IDR)": "idr_inr",
        }
    )

    # --------------------------------------------------------
    # Convert dates
    # --------------------------------------------------------

    df["date"] = pd.to_datetime(
        df["date"],
        format="%d/%m/%Y",
        errors="coerce"
    )

    # --------------------------------------------------------
    # Convert currency columns
    # --------------------------------------------------------

    currency_columns = [
        "usd_inr",
        "gbp_inr",
        "eur_inr",
        "jpy_inr",
        "aed_inr",
        "idr_inr",
    ]

    for column in currency_columns:

        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    # --------------------------------------------------------
    # Remove invalid dates
    # --------------------------------------------------------

    df = df.dropna(
        subset=["date"]
    )

    # --------------------------------------------------------
    # Remove duplicate dates
    # --------------------------------------------------------

    df = df.drop_duplicates(
        subset=["date"],
        keep="first"
    )

    # --------------------------------------------------------
    # Sort chronologically
    # --------------------------------------------------------

    df = df.sort_values(
        "date"
    )

    df = df.reset_index(
        drop=True
    )

    return df


# ============================================================
# VALIDATE DATA
# ============================================================

def validate_data(df):

    print("\nData validation")
    print("----------------------------")

    print(
        f"Rows: {len(df)}"
    )

    print(
        f"Date range: "
        f"{df['date'].min().date()} → "
        f"{df['date'].max().date()}"
    )

    print(
        f"Duplicate dates: "
        f"{df['date'].duplicated().sum()}"
    )

    print("\nMissing values:")

    print(
        df[
            [
                "usd_inr",
                "gbp_inr",
                "eur_inr",
                "jpy_inr",
                "aed_inr",
                "idr_inr",
            ]
        ].isna().sum()
    )

    # --------------------------------------------------------
    # USD/INR is essential for this project
    # --------------------------------------------------------

    if df["usd_inr"].isna().all():

        raise ValueError(
            "USD/INR column contains no valid values."
        )


# ============================================================
# DATABASE STATUS
# ============================================================

def get_database_latest_date(connection):

    result = connection.execute(
        text(
            """
            SELECT MAX(date)
            FROM rbi_exchange_rates
            """
        )
    )

    latest_date = result.scalar()

    return latest_date


# ============================================================
# LOAD INTO POSTGRESQL
# ============================================================

def load_to_postgresql(df):
    """
    Insert new RBI records.

    Existing dates are ignored safely.
    """

    engine = get_database_engine()

    inserted = 0
    skipped = 0

    with engine.begin() as connection:

        # ----------------------------------------------------
        # Existing database status
        # ----------------------------------------------------

        existing_latest_date = (
            get_database_latest_date(
                connection
            )
        )

        print("\nDatabase status")
        print("----------------------------")

        if existing_latest_date:

            print(
                "Latest date already in database: "
                f"{pd.Timestamp(existing_latest_date).date()}"
            )

        else:

            print(
                "Database currently contains no RBI records."
            )

        # ----------------------------------------------------
        # Insert records
        # ----------------------------------------------------

        for _, row in df.iterrows():

            result = connection.execute(
                text(
                    """
                    INSERT INTO rbi_exchange_rates
                    (
                        date,
                        usd_inr,
                        gbp_inr,
                        eur_inr,
                        jpy_inr,
                        aed_inr,
                        idr_inr
                    )
                    VALUES
                    (
                        :date,
                        :usd_inr,
                        :gbp_inr,
                        :eur_inr,
                        :jpy_inr,
                        :aed_inr,
                        :idr_inr
                    )
                    ON CONFLICT (date)
                    DO NOTHING
                    """
                ),
                {
                    "date": row["date"],
                    "usd_inr": row["usd_inr"],
                    "gbp_inr": row["gbp_inr"],
                    "eur_inr": row["eur_inr"],
                    "jpy_inr": row["jpy_inr"],
                    "aed_inr": row["aed_inr"],
                    "idr_inr": row["idr_inr"],
                }
            )

            if result.rowcount == 1:

                inserted += 1

            else:

                skipped += 1

        # ----------------------------------------------------
        # New database status
        # ----------------------------------------------------

        new_latest_date = (
            get_database_latest_date(
                connection
            )
        )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print("\nDatabase loading summary")
    print("----------------------------")

    print(
        f"New records inserted: {inserted}"
    )

    print(
        f"Existing records skipped: {skipped}"
    )

    if new_latest_date:

        print(
            "Latest database date: "
            f"{pd.Timestamp(new_latest_date).date()}"
        )


# ============================================================
# MAIN PIPELINE
# ============================================================

def main():

    print("====================================")
    print("      InsightIQ RBI Pipeline")
    print("====================================")

    # --------------------------------------------------------
    # EXTRACT
    # --------------------------------------------------------

    df = read_rbi_file()

    # --------------------------------------------------------
    # TRANSFORM
    # --------------------------------------------------------

    df = clean_rbi_data(df)

    # --------------------------------------------------------
    # VALIDATE
    # --------------------------------------------------------

    validate_data(df)

    # --------------------------------------------------------
    # LOAD
    # --------------------------------------------------------

    load_to_postgresql(df)

    print(
        "\nPipeline completed successfully! 🚀"
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()