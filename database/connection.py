"""
Database connection module for InsightIQ AI.
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine


# Load environment variables
load_dotenv()


def get_database_url():
    """Return the PostgreSQL connection URL."""

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        raise ValueError(
            "DATABASE_URL is not configured. "
            "Please create a .env file."
        )

    return database_url


def get_database_engine():
    """Create and return the SQLAlchemy engine."""

    database_url = get_database_url()

    engine = create_engine(database_url)

    return engine


if __name__ == "__main__":
    print("InsightIQ database module loaded.")