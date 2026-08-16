"""
Create database tables for InsightIQ AI.
"""

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Integer,
    Numeric,
    text,
)
from sqlalchemy.orm import declarative_base

from connection import get_database_engine


Base = declarative_base()


class RBIExchangeRate(Base):
    """
    Stores RBI reference exchange rates.
    """

    __tablename__ = "rbi_exchange_rates"

    id = Column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    date = Column(
        Date,
        nullable=False,
        unique=True,
    )

    usd_inr = Column(
        Numeric(12, 4),
        nullable=True,
    )

    gbp_inr = Column(
        Numeric(12, 4),
        nullable=True,
    )

    eur_inr = Column(
        Numeric(12, 4),
        nullable=True,
    )

    jpy_inr = Column(
        Numeric(12, 4),
        nullable=True,
    )

    aed_inr = Column(
        Numeric(12, 4),
        nullable=True,
    )

    idr_inr = Column(
        Numeric(12, 4),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False,
    )


def create_tables():
    """Create all InsightIQ database tables."""

    engine = get_database_engine()

    Base.metadata.create_all(engine)

    print("====================================")
    print("InsightIQ database tables created!")
    print("====================================")
    print("Table created: rbi_exchange_rates")


if __name__ == "__main__":
    create_tables()