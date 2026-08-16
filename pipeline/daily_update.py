import subprocess
import sys
from datetime import datetime


# ============================================================
# INSIGHTIQ AI — DAILY UPDATE PIPELINE
# ============================================================

def run_step(title, module):
    """Run one project module and stop if it fails."""

    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

    result = subprocess.run(
        [
            sys.executable,
            "-m",
            module
        ],
        check=False
    )

    if result.returncode != 0:
        print("\n❌ STEP FAILED")
        print(f"Module: {module}")
        print(f"Exit code: {result.returncode}")

        raise RuntimeError(
            f"{title} failed."
        )

    print(f"\n✅ {title} completed successfully.")


def main():

    start_time = datetime.now()

    print("=" * 60)
    print("        INSIGHTIQ AI — DAILY UPDATE")
    print("=" * 60)

    print(
        f"Started: "
        f"{start_time.strftime('%Y-%m-%d %H:%M:%S')}"
    )

    try:

        # ----------------------------------------------------
        # STEP 1 — RBI INGESTION
        # ----------------------------------------------------

        run_step(
            "RBI DATA INGESTION",
            "ingestion.rbi_ingestion"
        )


        # ----------------------------------------------------
        # STEP 2 — CRUDE OIL INGESTION
        # ----------------------------------------------------

        run_step(
            "CRUDE OIL DATA INGESTION",
            "ingestion.oil_ingestion"
        )


        # ----------------------------------------------------
        # STEP 3 — FEATURE ENGINEERING
        # ----------------------------------------------------

        run_step(
            "FEATURE ENGINEERING",
            "prediction.feature_builder"
        )


        # ----------------------------------------------------
        # STEP 4 — PREDICTION
        # ----------------------------------------------------

        run_step(
            "MODEL PREDICTION",
            "prediction.predict"
        )


    except Exception as error:

        print("\n" + "=" * 60)
        print("        ❌ DAILY PIPELINE FAILED")
        print("=" * 60)

        print(f"\nError: {error}")

        sys.exit(1)


    end_time = datetime.now()

    duration = end_time - start_time


    print("\n" + "=" * 60)
    print("        ✅ DAILY PIPELINE COMPLETE")
    print("=" * 60)

    print(
        f"\nStarted : "
        f"{start_time.strftime('%Y-%m-%d %H:%M:%S')}"
    )

    print(
        f"Finished: "
        f"{end_time.strftime('%Y-%m-%d %H:%M:%S')}"
    )

    print(
        f"Duration: {duration}"
    )

    print("\nPipeline executed successfully:")
    print("  1. RBI ingestion")
    print("  2. Oil ingestion")
    print("  3. Feature engineering")
    print("  4. Random Forest prediction")

    print("\nInsightIQ AI is ready for the dashboard. 🚀")


if __name__ == "__main__":
    main()